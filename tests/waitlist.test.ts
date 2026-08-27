import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Reason: Vercel deploys every source file under api/ as a public function.
// Keep handler tests outside that directory so test code cannot become a route.
import handler from "../api/waitlist";

beforeEach(() => {
  vi.stubEnv("PORTER_API_URL", "https://api.buildwithporter.com/");
  vi.stubEnv("PORTER_PUBLIC_AUDIT_KEY", "proxy-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://buildwithporter.com/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vercel-Forwarded-For": "203.0.113.8",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function captureUpstream() {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({ ok: true, duplicate: false }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("waitlist typed notification proxy", () => {
  it("forwards a main demo command without provider fields", async () => {
    const fetchMock = captureUpstream();
    const response = await handler(request({
      submission_id: "10000000-0000-4000-8000-000000000001",
      name: "Ada",
      email: "ada@example.com",
      company: "Example Co",
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.buildwithporter.com/api/public/landing-notifications",
    );
    const upstreamRequest = fetchMock.mock.calls[0]?.[1];
    const upstreamBody = JSON.parse(String(upstreamRequest?.body));
    expect(upstreamRequest?.headers).toMatchObject({
      "X-Porter-Audit-Key": "proxy-secret",
      "X-Forwarded-For": "203.0.113.8",
    });
    expect(upstreamBody).toMatchObject({
      submission_id: "10000000-0000-4000-8000-000000000001",
      action: "book_demo",
      name: "Ada",
      email: "ada@example.com",
      company: "Example Co",
    });
    for (const providerField of ["from", "to", "subject", "text", "html", "message_stream"]) {
      expect(upstreamBody).not.toHaveProperty(providerField);
    }
  });

  it("uses the same book_demo command with audit source context", async () => {
    const fetchMock = captureUpstream();
    const response = await handler(request({
      submission_id: "10000000-0000-4000-8000-000000000002",
      name: "Grace",
      email: "grace@example.com",
      company: "Compiler Co",
      source: "financial_health_audit",
      action: "book_demo",
    }));

    expect(response.status).toBe(200);
    const upstreamBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(upstreamBody).toMatchObject({ action: "book_demo", source: "financial_health_audit" });
  });

  it("rejects unknown actions and missing stable ids before upstream", async () => {
    const fetchMock = captureUpstream();
    const invalidAction = await handler(request({
      submission_id: "10000000-0000-4000-8000-000000000003",
      email: "ada@example.com",
      source: "financial_health_audit",
      action: "send_any_email",
    }));
    const missingId = await handler(request({
      name: "Ada",
      email: "ada@example.com",
      company: "Example Co",
    }));

    expect(invalidAction.status).toBe(400);
    expect(missingId.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trusts only Vercel's visitor IP header", async () => {
    const fetchMock = captureUpstream();
    const response = await handler(new Request("https://buildwithporter.com/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.4" },
      body: JSON.stringify({
        submission_id: "10000000-0000-4000-8000-000000000004",
        name: "Ada",
        email: "ada@example.com",
        company: "Example Co",
      }),
    }));

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-Forwarded-For": "unknown" });
  });

  it("rejects oversized anonymous report content", async () => {
    const fetchMock = captureUpstream();
    for (const oversizedField of [
      { report_headline: "x".repeat(301) },
      { report_review_period: "x".repeat(301) },
      { report_summary: "x".repeat(4001) },
      { report_findings: ["x".repeat(501)] },
    ]) {
      const response = await handler(request({
        submission_id: "10000000-0000-4000-8000-000000000005",
        email: "ada@example.com",
        source: "financial_health_audit",
        action: "unlock_report",
        ...oversizedField,
      }));
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized lead fields before upstream", async () => {
    const fetchMock = captureUpstream();
    for (const oversizedField of [
      { name: "x".repeat(121) },
      { email: `${"x".repeat(309)}@example.com` },
      { company: "x".repeat(201) },
      { existing_finance_team: "x".repeat(501) },
      { help_with: "x".repeat(4001) },
    ]) {
      const response = await handler(request({
        submission_id: "10000000-0000-4000-8000-000000000008",
        name: "Ada",
        email: "ada@example.com",
        company: "Example Co",
        ...oversizedField,
      }));
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("inspects and forwards only the first ten findings", async () => {
    const fetchMock = captureUpstream();
    const response = await handler(request({
      submission_id: "10000000-0000-4000-8000-000000000009",
      email: "ada@example.com",
      source: "financial_health_audit",
      action: "unlock_report",
      report_findings: [
        ...Array.from({ length: 10 }, (_, index) => `Finding ${index}`),
        "x".repeat(501),
      ],
    }));

    expect(response.status).toBe(200);
    const upstreamBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(upstreamBody.report_findings).toHaveLength(10);
  });

  it("rejects literal null JSON", async () => {
    const response = await handler(request(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON object" });
  });

  it("never relays upstream error details to the browser", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ detail: { original_error: "sentinel-provider-secret" } }, { status: 502 }),
    ));
    const response = await handler(request({
      submission_id: "10000000-0000-4000-8000-000000000006",
      name: "Ada",
      email: "ada@example.com",
      company: "Example Co",
    }));
    const responseText = await response.text();

    expect(response.status).toBe(502);
    expect(responseText).not.toContain("sentinel-provider-secret");
    expect(JSON.parse(responseText)).toEqual({ error: "Email delivery failed" });
  });
});
