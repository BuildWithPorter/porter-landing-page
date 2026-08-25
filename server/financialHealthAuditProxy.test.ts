import assert from "node:assert/strict";
import test from "node:test";

import { handleFinancialHealthAuditProxy } from "./financialHealthAuditProxy.ts";

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
