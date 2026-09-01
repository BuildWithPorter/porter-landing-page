// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  getFinancialHealthQuickBooksConnection,
  notifyFinancialHealthAuditReportStarted,
  waitForFinancialHealthQuickBooksConnection,
} from "./financialHealthAudit";
import {
  FinancialHealthAuditRequestError,
  isFinancialHealthAuditAccessError,
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
