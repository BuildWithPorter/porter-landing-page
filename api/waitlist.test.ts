import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./waitlist";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("waitlist audit notifications", () => {
  it("preserves the generate_report action from develop", async () => {
    // Reason: PR 43 originally regressed the report-start notification while
    // adding demo-source labels. This guard keeps both behaviors on one handler.
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
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
    const resendRequest = fetchMock.mock.calls[0]?.[1];
    const resendBody = JSON.parse(String(resendRequest?.body));
    expect(resendBody.subject).toBe("Porter - financial health audit report started");
    expect(resendBody.text).toContain("FHA (name & email):");
    expect(resendBody.text).toContain("Action: Started audit report");
  });
});
