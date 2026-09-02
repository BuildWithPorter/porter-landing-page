// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  getFinancialHealthQuickBooksConnection,
  notifyFinancialHealthAuditReportStarted,
  verifyFinancialHealthAuditEmailRecovery,
  waitForFinancialHealthAudit,
  waitForFinancialHealthQuickBooksConnection,
} from "./financialHealthAudit";
import {
  FinancialHealthAuditRequestError,
  isFinancialHealthAuditAccessError,
  isFinancialHealthAuditGenerationLocked,
  isFinancialHealthAuditRecoveryConflict,
} from "./financialHealthAuditError";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("preserves a masked 404 as typed stale-access evidence", async () => {
  // Reason: The API intentionally returns the same response for a missing audit
  // and a rotated bearer. The controller needs the status, not brittle message
  // parsing, to send an older tab through email proof instead of report retry.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ detail: { message: "Financial health audit not found" } }),
  }));

  let caught: unknown;
  try {
    await getFinancialHealthQuickBooksConnection("audit", "stale-bearer");
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(FinancialHealthAuditRequestError);
  expect(caught).toMatchObject({ status: 404 });
  expect(isFinancialHealthAuditAccessError(caught)).toBe(true);
});

it("preserves only the structured retryable recovery conflict contract", async () => {
  // Reason: A verified-recovery CAS loser must restart with a fresh challenge,
  // while unrelated 409 responses must remain ordinary actionable errors.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({
      detail: {
        code: "AUDIT_RECOVERY_CONFLICT",
        message: "The saved audit changed during recovery.",
        details: { retryable: true },
      },
    }),
  }));

  let caught: unknown;
  try {
    await verifyFinancialHealthAuditEmailRecovery("challenge", "123456");
  } catch (error) {
    caught = error;
  }

  expect(caught).toMatchObject({
    status: 409,
    code: "AUDIT_RECOVERY_CONFLICT",
    details: { retryable: true },
  });
  expect(isFinancialHealthAuditRecoveryConflict(caught)).toBe(true);
  expect(isFinancialHealthAuditRecoveryConflict(
    new FinancialHealthAuditRequestError("Other conflict", 409, "CONFLICT", { retryable: true }),
  )).toBe(false);
});

it("waits for canonical ingestion rather than treating the OAuth redirect as readiness", async () => {
  // Reason: The questionnaire can finish while the ordinary import is still
  // running; status polling must defer the paid investigation without a retry click.
  vi.useFakeTimers();
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "pending" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "connected" }) });
  vi.stubGlobal("fetch", fetch);
  let settled = false;
  const pending = waitForFinancialHealthQuickBooksConnection("audit", "bearer").then((value) => { settled = true; return value; });
  await vi.advanceTimersByTimeAsync(4_999);
  expect(settled).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await pending).toEqual({ status: "connected" });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: "quickbooks_status", auditId: "audit", auditToken: "bearer" });
});

it.each(["failed", "not_started"])("does not treat %s imports as usable books", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status }) }));
  await expect(waitForFinancialHealthQuickBooksConnection("audit", "bearer")).rejects.toThrow("reconnect");
});

it("surfaces the API's actionable QuickBooks failure reason", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "failed",
      errorMessage: "These books already belong to a Porter workspace. Sign in to use them.",
    }),
  }));

  await expect(waitForFinancialHealthQuickBooksConnection("audit", "bearer")).rejects.toThrow(
    "These books already belong to a Porter workspace. Sign in to use them.",
  );
});

it("replaces the legacy catch-all import error with clear recovery guidance", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "failed",
      errorMessage: "QuickBooks could not finish importing. Sign in if these books already belong to a Porter account, or try again.",
    }),
  }));

  await expect(waitForFinancialHealthQuickBooksConnection("audit", "bearer")).rejects.toThrow(
    "If these books are already connected to Porter, sign in to that Porter account.",
  );
});

it("cancels pending import polling when the visitor changes sessions", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "pending" }) });
  vi.stubGlobal("fetch", fetch);
  const pending = waitForFinancialHealthQuickBooksConnection("audit", "bearer", controller.signal);
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  await vi.advanceTimersByTimeAsync(5_000);
  expect(fetch).toHaveBeenCalledOnce();
});

it("keeps report-start notification in the typed transport adapter", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);

  await notifyFinancialHealthAuditReportStarted("audit", "owner@example.com");

  expect(fetch).toHaveBeenCalledWith("/api/waitlist", expect.objectContaining({ method: "POST" }));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    submission_id: "audit",
    email: "owner@example.com",
    source: "financial_health_audit",
    action: "generate_report",
  });
});

it("keeps polling a generating audit past ten minutes until it completes", async () => {
  // Reason (POR-2452): The old 10-minute deadline painted the failed-report
  // chrome while Porter was still working. QBO-backed runs commonly exceed it.
  vi.useFakeTimers();
  const report = { version: 2, eyebrow: "done", title: "Report" };
  let polls = 0;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
    polls += 1;
    if (polls < 8) {
      return { ok: true, json: async () => ({ status: "generating", report: null }) };
    }
    return { ok: true, json: async () => ({ status: "completed", report }) };
  }));

  const pending = waitForFinancialHealthAudit("audit", "token");
  await vi.advanceTimersByTimeAsync(12 * 60_000);
  await expect(pending).resolves.toMatchObject({ status: "completed", report });
  expect(polls).toBeGreaterThan(1);
});

it("retries a generating poll after a transport failure", async () => {
  vi.useFakeTimers();
  const report = { version: 2, eyebrow: "done", title: "Report" };
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ detail: { message: "temporarily unavailable" } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "completed", report }),
    }));

  const pending = waitForFinancialHealthAudit("audit", "token");
  await vi.advanceTimersByTimeAsync(5_000);
  await expect(pending).resolves.toMatchObject({ status: "completed", report });
});

it("treats only typed generation locks as followable conflicts", () => {
  expect(isFinancialHealthAuditGenerationLocked(
    new FinancialHealthAuditRequestError(
      "This audit can no longer be edited.",
      409,
      "conflict",
      { reason: "generation_in_progress" },
    ),
  )).toBe(true);
  expect(isFinancialHealthAuditGenerationLocked(
    new FinancialHealthAuditRequestError(
      "This audit can no longer be edited.",
      409,
      "conflict",
      { reason: "audit_completed" },
    ),
  )).toBe(true);
  expect(isFinancialHealthAuditGenerationLocked(
    new FinancialHealthAuditRequestError(
      "This audit can no longer be edited.",
      409,
      "conflict",
    ),
  )).toBe(true);
  expect(isFinancialHealthAuditGenerationLocked(
    new FinancialHealthAuditRequestError(
      "This audit is already saved under a different email.",
      409,
      "conflict",
      { field: "captured_email", reason: "email_mismatch" },
    ),
  )).toBe(false);
  expect(isFinancialHealthAuditGenerationLocked(
    new FinancialHealthAuditRequestError("Other conflict", 409, "CONFLICT", { retryable: true }),
  )).toBe(false);
});
