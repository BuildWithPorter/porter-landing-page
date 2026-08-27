import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./waitlist";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("waitlist audit notifications", () => {
  it("forwards the generate_report action to Porter's typed backend command", async () => {
    // Reason: Landing must never regress into a direct provider payload; this
    // test pins the constrained API handoff instead of an email vendor request.
    vi.stubEnv("PORTER_API_URL", "https://api.buildwithporter.com");
    vi.stubEnv("PORTER_PUBLIC_AUDIT_KEY", "proxy-secret");
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000001" });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handler(
      new Request("https://buildwithporter.com/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ada",
          email: "ada@example.com",
          source: "financial_health_audit",
          action: "generate_report",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.buildwithporter.com/api/public/landing-notifications",
    );
    const upstreamRequest = fetchMock.mock.calls[0]?.[1];
    const upstreamBody = JSON.parse(String(upstreamRequest?.body));
    expect(upstreamRequest?.headers).toMatchObject({
      "X-Porter-Audit-Key": "proxy-secret",
    });
    expect(upstreamBody).toMatchObject({
      submission_id: "00000000-0000-4000-8000-000000000001",
      source: "financial_health_audit",
      action: "generate_report",
      name: "Ada",
      email: "ada@example.com",
    });
  });
});
