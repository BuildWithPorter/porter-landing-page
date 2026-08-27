import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import handler from "./waitlist.ts";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.PORTER_API_URL = "https://api.buildwithporter.com/";
  process.env.PORTER_PUBLIC_AUDIT_KEY = "test-proxy-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.PORTER_API_URL;
  delete process.env.PORTER_PUBLIC_AUDIT_KEY;
});

function request(body: Record<string, unknown>) {
  return new Request("https://buildwithporter.com/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vercel-Forwarded-For": "203.0.113.8",
    },
    body: JSON.stringify(body),
  });
}

function captureUpstream() {
  let call: { input: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    call = { input: String(input), init: init ?? {} };
    return Response.json({ ok: true, duplicate: false });
  }) as typeof fetch;
  return () => {
    assert.ok(call);
    return call;
  };
}

test("main demo forwards one typed command to the fixed authenticated backend", async () => {
  const captured = captureUpstream();
  const response = await handler(request({
    submission_id: "10000000-0000-4000-8000-000000000001",
    name: "Ada",
    email: "ada@example.com",
    company: "Example Co",
  }));

  assert.equal(response.status, 200);
  const call = captured();
  assert.equal(call.input, "https://api.buildwithporter.com/api/public/landing-notifications");
  const headers = new Headers(call.init.headers);
  assert.equal(headers.get("X-Porter-Audit-Key"), "test-proxy-key");
  assert.equal(headers.get("X-Forwarded-For"), "203.0.113.8");
  const payload = JSON.parse(String(call.init.body));
  assert.deepEqual(payload, {
    submission_id: "10000000-0000-4000-8000-000000000001",
    name: "Ada",
    email: "ada@example.com",
    company: "Example Co",
    existing_finance_team: "",
    help_with: "",
    action: "book_demo",
  });
  for (const providerField of ["from", "to", "subject", "text", "html", "message_stream"]) {
    assert.equal(providerField in payload, false);
  }
});

test("financial-audit demo uses the same book_demo command with source context", async () => {
  const captured = captureUpstream();
  const response = await handler(request({
    submission_id: "10000000-0000-4000-8000-000000000002",
    name: "Grace",
    email: "grace@example.com",
    company: "Compiler Co",
    source: "financial_health_audit",
    action: "book_demo",
  }));

  assert.equal(response.status, 200);
  const payload = JSON.parse(String(captured().init.body));
  assert.equal(payload.action, "book_demo");
  assert.equal(payload.source, "financial_health_audit");
});

test("unknown audit actions are rejected before any upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({ ok: true });
  }) as typeof fetch;

  const response = await handler(request({
    submission_id: "10000000-0000-4000-8000-000000000003",
    email: "ada@example.com",
    source: "financial_health_audit",
    action: "send_any_email",
  }));

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("a browser-stable submission id is required", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({ ok: true });
  }) as typeof fetch;

  const response = await handler(request({
    name: "Ada",
    email: "ada@example.com",
    company: "Example Co",
  }));

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("a client-supplied generic forwarding header is not trusted", async () => {
  const captured = captureUpstream();
  const response = await handler(new Request("https://buildwithporter.com/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.4",
    },
    body: JSON.stringify({
      submission_id: "10000000-0000-4000-8000-000000000004",
      name: "Ada",
      email: "ada@example.com",
      company: "Example Co",
    }),
  }));

  assert.equal(response.status, 200);
  const headers = new Headers(captured().init.headers);
  assert.equal(headers.get("X-Forwarded-For"), "unknown");
});

test("oversized audit findings are rejected before any upstream call", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({ ok: true });
  }) as typeof fetch;

  const response = await handler(request({
    submission_id: "10000000-0000-4000-8000-000000000005",
    email: "ada@example.com",
    source: "financial_health_audit",
    action: "unlock_report",
    report_findings: ["x".repeat(501)],
  }));

  assert.equal(response.status, 400);
  assert.equal(called, false);
});

test("literal null JSON is rejected as an invalid object", async () => {
  const response = await handler(new Request("https://buildwithporter.com/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "null",
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON object" });
});

test("upstream error details are never relayed to the anonymous browser", async () => {
  globalThis.fetch = (async () => Response.json(
    { detail: { original_error: "sentinel-provider-secret" } },
    { status: 502 },
  )) as typeof fetch;

  const response = await handler(request({
    submission_id: "10000000-0000-4000-8000-000000000006",
    name: "Ada",
    email: "ada@example.com",
    company: "Example Co",
  }));
  const responseText = await response.text();

  assert.equal(response.status, 502);
  assert.equal(responseText.includes("sentinel-provider-secret"), false);
  assert.deepEqual(JSON.parse(responseText), { error: "Email delivery failed" });
});
