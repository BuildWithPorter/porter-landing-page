// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { waitForFinancialHealthQuickBooksConnection } from "./financialHealthAudit";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

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
