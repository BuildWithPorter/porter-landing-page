import assert from "node:assert/strict";
import test from "node:test";

import { handleFinancialHealthAuditProxy } from "./financialHealthAuditProxy.ts";

test("the public proxy rejects the removed OAuth recovery route", async () => {
  // Reason: Google recovery redirected public report visitors into the full
  // Porter app. Reject the old action at the proxy boundary even if a stale
  // client or hand-written request still tries to invoke it.
  const response = await handleFinancialHealthAuditProxy(
    new Request("https://buildwithporter.com/api/financial-health-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "recovery_start",
        recoveryState: "s".repeat(43),
        method: "google",
      }),
    }),
    { apiBase: "https://api.buildwithporter.com", proxyKey: "k".repeat(43) },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid audit action" });
});

test("recovery request uses the bearer-owned audit endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const auditId = "7d728f54-b353-4c15-904d-940ffb1cf7c7";
  const auditToken = "t".repeat(43);
  const upstreamCalls: Array<{ url: string; headers: Headers; body: string | undefined }> = [];
  globalThis.fetch = async (input, init) => {
    upstreamCalls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? String(init.body) : undefined,
    });
    return Response.json({ state: "s".repeat(43) });
  };

  try {
    const response = await handleFinancialHealthAuditProxy(
      new Request("https://buildwithporter.com/api/financial-health-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recovery_request",
          auditId,
          auditToken,
        }),
      }),
      { apiBase: "https://api.buildwithporter.com", proxyKey: "k".repeat(43) },
    );

    assert.equal(response.status, 200);
    const upstream = upstreamCalls[0];
    assert.equal(
      upstream.url,
      `https://api.buildwithporter.com/api/public/financial-health-audits/${auditId}/recovery/request`,
    );
    assert.equal(upstream.headers.get("X-Porter-Audit-Token"), auditToken);
    // Reason: Email-only recovery has no callback destination. Keeping this
    // request body empty prevents the retired OAuth handoff from surviving as
    // an undocumented alternate transport.
    assert.equal(upstream.body, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("local email recovery exposes only a loopback test code and verifies its digest", async () => {
  const originalFetch = globalThis.fetch;
  const originalResendKey = process.env.RESEND_API_KEY;
  const upstreamCalls: Array<{ url: string; body: Record<string, string> }> = [];
  delete process.env.RESEND_API_KEY;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    upstreamCalls.push({ url, body });
    if (url.endsWith("/recovery/email/start")) {
      return Response.json({ email: "owner@example.com" });
    }
    return Response.json({ id: "saved-report" });
  };

  try {
    const started = await handleFinancialHealthAuditProxy(
      new Request("http://localhost:5182/api/financial-health-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recovery_email_start", recoveryState: "s".repeat(43) }),
      }),
      { apiBase: "http://localhost:8000", proxyKey: "k".repeat(43) },
    );
    const challenge = await started.json() as { challengeId: string; developmentCode: string };
    assert.match(challenge.developmentCode, /^\d{6}$/);
    assert.equal("email" in challenge, false);

    const verified = await handleFinancialHealthAuditProxy(
      new Request("http://localhost:5182/api/financial-health-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recovery_email_verify",
          challengeId: challenge.challengeId,
          code: challenge.developmentCode,
        }),
      }),
      { apiBase: "http://localhost:8000", proxyKey: "k".repeat(43) },
    );

    assert.equal(verified.status, 200);
    assert.equal(upstreamCalls[0].body.code_digest, upstreamCalls[1].body.code_digest);
    assert.equal(upstreamCalls[0].body.challenge_id, challenge.challengeId);
    assert.equal(upstreamCalls[1].body.challenge_id, challenge.challengeId);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendKey;
  }
});
