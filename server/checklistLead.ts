// Shared lead handler for the checklist campaign pages (Sale-Ready, Books Cleanup).
//
// Reason: Both campaigns run the same flow: validate a small form, send the
// visitor their checklist and the operator a lead notification in one
// idempotent Resend batch, then report a Meta Lead with the same event ID the
// browser pixel uses. Keeping that flow in one place means a fix to delivery,
// idempotency or dedupe lands on every campaign instead of drifting per page.
// Each campaign supplies only what differs (answers, copy, event prefix).
//
// This module deliberately has no relative imports: api/*.ts imports it as
// "../server/checklistLead.js" (Vercel bundling) while node --test imports it as
// "./checklistLead.ts", and a nested relative import could only satisfy one.

export const META_DATASET_ID = "1383684593949468";

export type ChecklistLead = {
  submission_id: string;
  first_name: string;
  email: string;
  page_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  meta_fbp?: string;
  meta_fbc?: string;
  [answer: string]: unknown;
};

export type ChecklistOffer = {
  /** Log prefix, e.g. "Sale-Ready". */
  label: string;
  /** Meta event ID prefix; must match the browser's fbq eventID prefix. */
  metaLeadEventPrefix: string;
  /** Resend Idempotency-Key namespace. */
  idempotencyPrefix: string;
  defaultPageUrl: string;
  /** Validates the campaign-specific answers on the decoded body. */
  validAnswers: (lead: Record<string, unknown>) => boolean;
  /** Campaign-specific rows for the operator notification, in display order. */
  answerRows: (lead: ChecklistLead) => [string, string][];
  checklistSubject: string;
  checklistHtml: () => string;
  notificationSubject: string;
  notificationRecipients: string[];
  /** Meta custom_data for the Lead event, when the campaign tags one. */
  metaCustomData?: Record<string, string>;
};

const UUID_V4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isSubmissionId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

export function validChecklistLead(offer: ChecklistOffer, value: unknown): value is ChecklistLead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  return isSubmissionId(lead.submission_id)
    && typeof lead.first_name === "string" && lead.first_name.trim().length > 0 && lead.first_name.length <= 120
    && typeof lead.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.email.length <= 320
    && offer.validAnswers(lead);
}

export function checklistItemsHtml(items: readonly (readonly [string, string])[]): string {
  return items.map(([title, detail]) => `<li style="margin:0 0 14px"><strong>${escapeHtml(title)}</strong>${detail ? ` ${escapeHtml(detail)}` : ""}</li>`).join("");
}

export function leadNotificationHtml(offer: ChecklistOffer, lead: ChecklistLead): string {
  const details: [string, string][] = [
    // Reason: A stable submission ID connects the operator's lead email to
    // conversion analytics without putting the visitor's address in PostHog.
    ["Submission ID", lead.submission_id], ["Name", lead.first_name.trim()], ["Email", lead.email.trim().toLowerCase()],
    ...offer.answerRows(lead),
    ...UTM_KEYS.map((key): [string, string] => [key, safeText(lead[key], 200)]),
  ];
  return `<h1>${escapeHtml(offer.notificationSubject)}</h1><dl>${details.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}

export type MetaEvent = {
  eventName: "Lead" | "Schedule";
  eventId: string;
  eventSourceUrl: string;
  email?: string;
  visitorIp: string;
  userAgent: string;
  fbp?: string;
  fbc?: string;
  customData?: Record<string, string>;
};

export async function sendMetaEvent(event: MetaEvent, logLabel: string): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  let em: string[] | undefined;
  if (event.email) {
    const emailHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(event.email.trim().toLowerCase()));
    em = [Array.from(new Uint8Array(emailHash), byte => byte.toString(16).padStart(2, "0")).join("")];
  }
  const payload = { data: [{
    event_name: event.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    action_source: "website",
    event_source_url: event.eventSourceUrl,
    user_data: { em, client_ip_address: event.visitorIp || undefined, client_user_agent: event.userAgent || undefined, fbp: event.fbp || undefined, fbc: event.fbc || undefined },
    ...(event.customData ? { custom_data: event.customData } : {}),
  }] };
  const response = await fetch(`https://graph.facebook.com/v26.0/${META_DATASET_ID}/events`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (!response.ok) console.error(`${logLabel} Meta CAPI delivery failed`, response.status);
}

export function visitorIp(request: Request): string {
  return request.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0] || "";
}

export async function handleChecklistLead(offer: ChecklistOffer, request: Request): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  let decoded: unknown;
  try { decoded = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!validChecklistLead(offer, decoded)) return Response.json({ error: "Please complete the form" }, { status: 400 });
  const lead = decoded;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`${offer.label} Resend key is not configured`);
    return Response.json({ error: "Email delivery unavailable" }, { status: 503 });
  }
  const email = lead.email.trim().toLowerCase();
  // Reason: The main domain belongs to a different Resend team. Send from the
  // separately verified updates subdomain so this campaign cannot claim or
  // disrupt that team's existing mail configuration. One idempotent batch keeps
  // the checklist and lead notification paired across ambiguous network retries.
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${offer.idempotencyPrefix}/${lead.submission_id}` },
    body: JSON.stringify([
      { from: "Porter <hello@updates.buildwithporter.com>", to: [email], subject: offer.checklistSubject, html: offer.checklistHtml(), reply_to: "support@buildwithporter.com" },
      { from: "Porter <hello@updates.buildwithporter.com>", to: offer.notificationRecipients, subject: offer.notificationSubject, html: leadNotificationHtml(offer, lead), reply_to: email },
    ]),
  });
  if (!response.ok) {
    console.error(`${offer.label} Resend delivery failed`, response.status);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }
  // Reason: A successful checklist delivery is the conversion. CAPI uses the
  // same event ID as fbq so Meta counts one Lead rather than two.
  try {
    await sendMetaEvent({
      eventName: "Lead",
      eventId: `${offer.metaLeadEventPrefix}${lead.submission_id}`,
      eventSourceUrl: safeText(lead.page_url, 1000) || offer.defaultPageUrl,
      email: lead.email,
      visitorIp: visitorIp(request),
      userAgent: request.headers.get("user-agent") || "",
      fbp: safeText(lead.meta_fbp, 300),
      fbc: safeText(lead.meta_fbc, 300),
      customData: offer.metaCustomData,
    }, offer.label);
  } catch (error) { console.error(`${offer.label} Meta CAPI unavailable`, error); }
  return Response.json({ ok: true });
}
