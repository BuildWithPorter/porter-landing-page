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
  ] as const)("copies Michael on the actual %s prospect confirmation", async (_label, handler, offer, expectedAnswer) => {
    vi.stubEnv("RESEND_API_KEY", "test-resend");
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: [{ id: "confirmation" }, { id: "notification" }] }));
    vi.stubGlobal("fetch", transport);
    const response = await handler(new Request("https://example.test/api/lead", { method: "POST", body: JSON.stringify(lead) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, conversion_eligible: false });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(`${offer.idempotencyPrefix}/${lead.submission_id}`);
    const [confirmation, notification] = JSON.parse(String(init?.body));
    expect(confirmation).toMatchObject({
      from: "Porter <hello@updates.buildwithporter.com>", to: ["jordan@example.com"],
      cc: ["michael@buildwithporter.com"], reply_to: "michael@buildwithporter.com", subject: offer.checklistSubject,
    });
    expect(confirmation.subject).toMatch(/^Porter \| /);
    for (const value of ["Your answers", "Jordan Lee", "Example Studio", "+1 202 555 0100", expectedAnswer]) {
      expect(confirmation.html).toContain(value);
    }
    expect(confirmation.html).toContain(offer.checklistHtml());
    expect(confirmation.html).not.toContain("private-campaign-context");
    expect(confirmation.html).not.toContain("utm_source");
    expect(confirmation.html).not.toContain(lead.submission_id);
    expect(notification).toMatchObject({ to: offer.notificationRecipients, reply_to: "jordan@example.com" });
    expect(notification.subject).toMatch(/^Porter \| /);
    expect(notification.html).toContain("Reply all");
    expect(notification.html).toContain(offer.checklistSubject);
    expect(notification.html).toContain("private-campaign-context");
    expect(notification.html).toContain(lead.submission_id);
  });

  it("uses the outreach email shell rather than a separate marketing style", () => {
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      const html = leadConfirmationHtml(offer, lead);
      expect(html).toContain("max-width:560px;background-color:#FFFFFF;border-radius:8px;border-top:4px solid #2D6A4F");
      expect(html).toContain("'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif");
      expect(html).toContain("text-transform:uppercase;color:#2D6A4F");
      expect(html).not.toContain("Georgia");
      expect(html).not.toContain("background:#0c211a");
      expect(html).not.toContain("cid:");
    }
  });

  it("escapes submitted identity and business text in both forms' confirmations", () => {
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      const html = leadConfirmationHtml(offer, { ...lead, first_name: '<img src=x onerror="bad()">', business: 'Studio <script>bad()</script> & Co' });
      expect(html).not.toContain("<img");
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
