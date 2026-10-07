import assert from "node:assert/strict";
import test from "node:test";
import { handleChecklistLead, leadNotificationHtml, validChecklistLead, conversionEligibleEmail, type ChecklistOffer } from "./checklistLead.ts";

const OFFER: ChecklistOffer = {
  label: "Test",
  metaLeadEventPrefix: "test_lead_",
  idempotencyPrefix: "test",
  defaultPageUrl: "https://example.test/",
  validAnswers: lead => lead.books_behind === "Not sure",
  answerRows: lead => [["How far behind", String(lead.books_behind)]],
  checklistSubject: "Your checklist",
  checklistHtml: () => "<p>list</p>",
  notificationSubject: "New test lead",
  notificationRecipients: ["support@buildwithporter.com", "michael@buildwithporter.com"],
  metaCustomData: { offer: "books_cleanup" },
};
const LEAD = { submission_id: "0f8fad5b-d9cb-469f-a165-70867728950e", first_name: " Ann ", last_name: " Lee ", email: "Ann@customer.com", business: " anncafe.com ", books_behind: "Not sure", utm_source: "meta", utm_campaign: "yec" };

test("validates the shared identity fields and the offer's answers", () => {
  assert.equal(validChecklistLead(OFFER, LEAD), true);
  assert.equal(validChecklistLead(OFFER, { ...LEAD, books_behind: "Sometimes" }), false);
  assert.equal(validChecklistLead(OFFER, { ...LEAD, submission_id: "not-a-uuid" }), false);
  assert.equal(validChecklistLead(OFFER, { ...LEAD, email: "nope" }), false);
  // Reason (2026-10-07): last name and business are required so a lead on a
  // personal email address still has something to look up.
  assert.equal(validChecklistLead(OFFER, { ...LEAD, last_name: "  " }), false);
  assert.equal(validChecklistLead(OFFER, { ...LEAD, business: "" }), false);
  assert.equal(validChecklistLead(OFFER, { ...LEAD, business: undefined }), false);
});

test("the operator notification carries the answer and all five UTMs", () => {
  const html = leadNotificationHtml(OFFER, LEAD);
  assert.match(html, /How far behind<\/strong><\/dt><dd>Not sure/);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) assert.match(html, new RegExp(key));
  assert.match(html, /<dd>ann@customer.com<\/dd>/);
  assert.match(html, /Name<\/strong><\/dt><dd>Ann Lee<\/dd>/);
  assert.match(html, /Business or website<\/strong><\/dt><dd>anncafe.com<\/dd>/);
});

// Reason: Production staff QA previously contributed to reported paid leads.
test("staff and reserved test addresses do not qualify as acquired contacts", () => {
  for (const email of ["ben@buildwithporter.com", "qa@dev.buildwithporter.com", "test@example.com", "qa@customer.test"]) {
    assert.equal(conversionEligibleEmail(email), false);
  }
  assert.equal(conversionEligibleEmail("owner@gmail.com"), true);
  assert.equal(conversionEligibleEmail("owner@customer.com"), true);
});

test("test submissions exercise delivery without sending a Meta conversion", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-resend";
  process.env.META_CAPI_TOKEN = "test-meta";
  globalThis.fetch = (async (url: string) => { calls.push(url); return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const response = await handleChecklistLead(OFFER, new Request("https://example.test/api", { method: "POST", body: JSON.stringify({ ...LEAD, email: "qa@example.com" }) }));
    assert.deepEqual(await response.json(), { ok: true, conversion_eligible: false });
    assert.deepEqual(calls, ["https://api.resend.com/emails/batch"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.META_CAPI_TOKEN;
  }
});

test("sends one idempotent batch and a deduplicated Meta Lead tagged with the offer", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-resend";
  process.env.META_CAPI_TOKEN = "test-meta";
  globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const response = await handleChecklistLead(OFFER, new Request("https://example.test/api", { method: "POST", body: JSON.stringify(LEAD) }));
    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal((calls[0].init.headers as Record<string, string>)["Idempotency-Key"], `test/${LEAD.submission_id}`);
    const batch = JSON.parse(String(calls[0].init.body));
    assert.deepEqual(batch[1].to, ["support@buildwithporter.com", "michael@buildwithporter.com"]);
    const meta = JSON.parse(String(calls[1].init.body)).data[0];
    assert.equal(meta.event_name, "Lead");
    assert.equal(meta.event_id, `test_lead_${LEAD.submission_id}`);
    assert.deepEqual(meta.custom_data, { offer: "books_cleanup" });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.META_CAPI_TOKEN;
  }
});
