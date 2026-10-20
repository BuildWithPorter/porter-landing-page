import { afterEach, describe, expect, it, vi } from "vitest";
import booksCleanup, { BOOKS_CLEANUP_OFFER } from "../api/books-cleanup";
import saleReady, { SALE_READY_OFFER } from "../api/sale-ready";
import { leadConfirmationHtml } from "../server/checklistLead";

const lead = {
  submission_id: "0f8fad5b-d9cb-469f-a165-70867728950e", first_name: "Jordan", last_name: "Lee",
  email: "Jordan@example.com", business: "Example Studio", phone: "+1 202 555 0100",
  books_behind: "More than a year", timeframe: "In the next 6 months", books_status: "Three or more months behind",
  help_with: ["Catch up missing months", "Prepare numbers for buyers"],
  utm_source: "meta", utm_campaign: "private-campaign-context",
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("paid lead confirmation and follow-up", () => {
  // Reason: Exercise both public entrypoints so shared email behavior cannot
  // silently leave one live campaign with the old, unrelated confirmation.
  it.each([
    ["Books Cleanup", booksCleanup, BOOKS_CLEANUP_OFFER, "More than a year"],
    ["Sale-Ready", saleReady, SALE_READY_OFFER, "Prepare numbers for buyers"],
  ] as const)("copies Michael and blind-copies support on the actual %s prospect confirmation", async (_label, handler, offer, expectedAnswer) => {
    vi.stubEnv("RESEND_API_KEY", "test-resend");
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [{ id: "confirmation" }, { id: "notification" }] }));
    vi.stubGlobal("fetch", transport);
    const response = await handler(new Request("https://example.test/api/lead", { method: "POST", body: JSON.stringify(lead) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, conversion_eligible: false });
    expect(transport).toHaveBeenCalledTimes(2);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(`${offer.idempotencyPrefix}/${lead.submission_id}/confirmation`);
    const [confirmation, notification] = transport.mock.calls.map(([, call]) => JSON.parse(String(call?.body)));
    for (const message of [confirmation, notification]) {
      expect(message.html).toContain('src="cid:porter-logo"');
      expect(message.attachments[0]).toMatchObject({ filename: "porter-logo.png", content_id: "porter-logo" });
      expect(Buffer.from(message.attachments[0].content, "base64").subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    }
    expect(confirmation).toMatchObject({
      from: "Porter <hello@updates.buildwithporter.com>", to: ["jordan@example.com"],
      cc: ["michael@buildwithporter.com"], bcc: ["support@buildwithporter.com"], reply_to: "michael@buildwithporter.com", subject: offer.checklistSubject,
    });
    expect(confirmation.subject).toMatch(/^Porter \| /);
    for (const value of ["Your answers", "Jordan Lee", "Example Studio", "+1 202 555 0100", expectedAnswer]) {
      expect(confirmation.html).toContain(value);
    }
    expect(confirmation.html).toContain(offer.checklistHtml());
    expect(confirmation.html).not.toContain("private-campaign-context");
    expect(confirmation.html).not.toContain("utm_source");
    expect(confirmation.html).not.toContain(lead.submission_id);
    // Reason (Ben, 2026-10-20): An operator reply must not send quoted
    // attribution to the lead; only the confirmation is a customer thread.
    expect(notification).toMatchObject({ to: offer.notificationRecipients });
    expect(notification).not.toHaveProperty("reply_to");
    expect(notification).not.toHaveProperty("cc");
    expect(notification).not.toHaveProperty("bcc");
    expect(notification.html).toContain("Do not reply to or forward this email");
    expect(notification.subject).toMatch(/^Porter \| /);
    expect(notification.html).toContain("Reply all");
    expect(notification.html).toContain(offer.checklistSubject);
    expect(notification.html).toContain("private-campaign-context");
    expect(notification.html).toContain(lead.submission_id);
  });

  it("retries a partial send with identical per-message keys and embedded bytes", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-resend");
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: "confirmation" }))
      .mockResolvedValueOnce(Response.json({ error: "temporary" }, { status: 503 }))
      .mockResolvedValue(Response.json({ id: "accepted-or-deduplicated" }));
    vi.stubGlobal("fetch", transport);
    const request = () => new Request("https://example.test/api/lead", { method: "POST", body: JSON.stringify(lead) });
    expect((await booksCleanup(request())).status).toBe(502);
    expect((await booksCleanup(request())).status).toBe(200);
    for (const index of [0, 1]) {
      const first = transport.mock.calls[index][1];
      const retry = transport.mock.calls[index + 2][1];
      expect(new Headers(first?.headers).get("Idempotency-Key")).toBe(new Headers(retry?.headers).get("Idempotency-Key"));
      expect(first?.body).toBe(retry?.body);
    }
  });

  it("uses the outreach email shell rather than a separate marketing style", () => {
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      const html = leadConfirmationHtml(offer, lead);
      expect(html).toContain("max-width:560px;background-color:#FFFFFF;border-radius:8px;border-top:4px solid #2D6A4F");
      expect(html).toContain("'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif");
      expect(html).toContain('height="56" alt="Porter"');
      expect(html).not.toContain("Georgia");
      expect(html).not.toContain("background:#0c211a");
      expect(html).toContain("cid:porter-logo");
    }
  });

  it("escapes submitted identity and business text in both forms' confirmations", () => {
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      const html = leadConfirmationHtml(offer, { ...lead, first_name: '<img src=x onerror="bad()">', business: 'Studio <script>bad()</script> & Co' });
      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;img");
      expect(html).toContain("&lt;script&gt;bad()&lt;/script&gt; &amp; Co");
    }
  });

  it("preserves omitted optional answers without inventing qualification", () => {
    const minimal = { submission_id: lead.submission_id, first_name: "Jordan", email: lead.email, business: lead.business };
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      const html = leadConfirmationHtml(offer, minimal);
      expect(html).toContain("Not provided");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("In the next 6 months");
      expect(html).not.toContain("Three or more months behind");
    }
  });
});
