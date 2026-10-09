import assert from "node:assert/strict";
import test from "node:test";
import { handleChecklistLead, leadNotificationHtml, validChecklistLead, conversionEligibleEmail, type ChecklistOffer, sendMetaEvent } from "./checklistLead.ts";

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
  globalThis.fetch = (async (url: string) => { calls.push(url); return new Response(JSON.stringify({ events_received: url.includes("graph.facebook.com") ? 1 : undefined }), { status: 200 }); }) as typeof fetch;
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
  globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify({ events_received: url.includes("graph.facebook.com") ? 1 : undefined }), { status: 200 }); }) as typeof fetch;
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


const EVENT = { eventName: "Lead" as const, eventId: "test_lead_delivery", eventSourceUrl: "https://sale-ready.buildwithporter.com/", visitorIp: "192.0.2.1", userAgent: "test", email: "owner@example.com", fbc: "fb.1.123.click", fbp: "fb.1.123.browser" };

// Reason: Provider receipts must distinguish lead delivery from attribution.
test("missing Meta configuration is visible without sending or failing the lead", async () => {
  const originalFetch = globalThis.fetch;
  const previousToken = process.env.META_CAPI_TOKEN;
  delete process.env.META_CAPI_TOKEN;
  const calls: string[] = [];
  process.env.RESEND_API_KEY = "test-resend";
  globalThis.fetch = (async (url: string) => { calls.push(url); return new Response("{}", { status: 200 }); }) as typeof fetch;
  try {
    const response = await handleChecklistLead(OFFER, new Request("https://example.test/api", { method: "POST", body: JSON.stringify(LEAD) }));
    const body = await response.json() as { ok: boolean; meta_delivery: { status: string; event_id: string } };
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.meta_delivery.status, "missing_configuration");
    assert.equal(body.meta_delivery.event_id, `test_lead_${LEAD.submission_id}`);
    assert.deepEqual(calls, ["https://api.resend.com/emails/batch"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    if (previousToken === undefined) delete process.env.META_CAPI_TOKEN; else process.env.META_CAPI_TOKEN = previousToken;
  }
});

// Reason: Authentication/payload errors need repair, not duplicate delivery loops.
test("Meta rejections retain sanitized provider codes and are not retried", async () => {
  const originalFetch = globalThis.fetch;
  process.env.META_CAPI_TOKEN = "test-meta";
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return Response.json({ error: { code: 100, error_subcode: 33, message: "do not log this: owner@example.com" } }, { status: 400 }); }) as typeof fetch;
  try {
    const receipt = await sendMetaEvent(EVENT, "Test");
    assert.deepEqual(receipt, { status: "rejected", event_id: EVENT.eventId, attempts: 1, http_status: 400, error_code: 100, error_subcode: 33 });
    assert.equal(calls, 1);
    assert.equal(JSON.stringify(receipt).includes("owner@example.com"), false);
  } finally { globalThis.fetch = originalFetch; delete process.env.META_CAPI_TOKEN; }
});

// Reason: A 2xx response without accepted events must not masquerade as success.
test("Meta HTTP success requires exactly one accepted event", async () => {
  const originalFetch = globalThis.fetch;
  process.env.META_CAPI_TOKEN = "test-meta";
  try {
    for (const body of [{}, { events_received: 0 }, null]) {
      globalThis.fetch = (async () => Response.json(body)) as typeof fetch;
      assert.equal((await sendMetaEvent(EVENT, "Test")).status, "invalid_response");
    }
  } finally { globalThis.fetch = originalFetch; delete process.env.META_CAPI_TOKEN; }
});

// Reason: Retry the identical event after transport/rate-limit failures so an
// ambiguous first acceptance cannot count the same prospect twice.
test("transient failures retry the exact ID/time and eventually accept", async () => {
  const originalFetch = globalThis.fetch;
  process.env.META_CAPI_TOKEN = "test-meta";
  const bodies: string[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    bodies.push(String(init.body));
    if (bodies.length === 1) throw new TypeError("network unavailable");
    if (bodies.length === 2) return Response.json({ error: { code: 4 } }, { status: 429 });
    return Response.json({ events_received: 1 });
  }) as typeof fetch;
  try {
    assert.equal((await sendMetaEvent(EVENT, "Test")).status, "accepted");
    assert.equal(bodies.length, 3);
    assert.equal(new Set(bodies).size, 1);
    assert.deepEqual(JSON.parse(bodies[0]).data[0].user_data.em.length, 1);
  } finally { globalThis.fetch = originalFetch; delete process.env.META_CAPI_TOKEN; }
});

test("persistent transient errors stop after three delivery attempts", async () => {
  const originalFetch = globalThis.fetch;
  process.env.META_CAPI_TOKEN = "test-meta";
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return Response.json({ error: { is_transient: true, code: 2 } }, { status: 500 }); }) as typeof fetch;
  try {
    const receipt = await sendMetaEvent(EVENT, "Test");
    assert.equal(receipt.status, "unavailable");
    assert.equal(receipt.attempts, 3);
    assert.equal(calls, 3);
  } finally { globalThis.fetch = originalFetch; delete process.env.META_CAPI_TOKEN; }
});

// Reason: CDN outages can return HTML rather than Meta JSON; the HTTP status
// must still drive a bounded retry without changing the conversion identity.
test("transient non-JSON responses retry and retain the original payload", async () => {
  const originalFetch = globalThis.fetch;
  process.env.META_CAPI_TOKEN = "test-meta";
  const bodies: string[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(String(init?.body));
    return bodies.length === 1
      ? new Response("<html>unavailable</html>", { status: 503 })
      : Response.json({ events_received: 1 });
  };
  try {
    const receipt = await sendMetaEvent(EVENT, "Test");
    assert.equal(receipt.status, "accepted");
    assert.equal(receipt.attempts, 2);
    assert.equal(bodies[0], bodies[1]);
  } finally { globalThis.fetch = originalFetch; delete process.env.META_CAPI_TOKEN; }
});
