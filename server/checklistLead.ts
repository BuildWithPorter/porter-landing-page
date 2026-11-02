// Shared lead handler for the checklist campaign pages (Sale-Ready, Books Cleanup).
//
// Reason: Both campaigns run the same flow: validate a small form, send the
// visitor their checklist and the operator a lead notification with
// individually idempotent Resend sends, then report a Meta Lead with the same event ID the
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
  last_name?: string;
  email: string;
  phone?: string;
  /** Business name or website. Required on every checklist campaign. */
  business: string;
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
// Reason: Exact PNG from Porter Agents, Inc. outreach branding, read from
// production Storage on 2026-10-18. Bundle bytes so old emails never depend
// on an expiring signed URL or a later network/storage read.
const PORTER_LOGO_BASE64 = "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";
const FOLLOW_UP_EMAIL = "michael@buildwithporter.com";
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

export function conversionEligibleEmail(email: string): boolean {
  // Reason: A production tracking test appeared in the September campaign's
  // Lead totals. Staff and reserved test addresses may exercise delivery, but
  // must not train bidding or be reported as acquired prospects.
  const domain = email.trim().toLowerCase().split("@").at(-1) || "";
  return domain !== "buildwithporter.com" && !domain.endsWith(".buildwithporter.com")
    && !["example.com", "example.org", "example.net"].includes(domain)
    && !/\.(test|invalid|localhost|example)$/.test(domain);
}

export function validChecklistLead(offer: ChecklistOffer, value: unknown): value is ChecklistLead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  return isSubmissionId(lead.submission_id)
    && typeof lead.first_name === "string" && lead.first_name.trim().length > 0 && lead.first_name.length <= 120
    && (lead.last_name === undefined || (typeof lead.last_name === "string" && lead.last_name.length <= 120))
    && (lead.phone === undefined || (typeof lead.phone === "string" && lead.phone.length <= 40))
    && typeof lead.business === "string" && lead.business.trim().length > 0 && lead.business.length <= 200
    && typeof lead.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.email.length <= 320
    && offer.validAnswers(lead);
}

export function checklistItemsHtml(items: readonly (readonly [string, string])[]): string {
  return items.map(([title, detail]) => `<li style="margin:0 0 14px"><strong>${escapeHtml(title)}</strong>${detail ? ` ${escapeHtml(detail)}` : ""}</li>`).join("");
}

function submittedAnswerRows(offer: ChecklistOffer, lead: ChecklistLead): [string, string][] {
  // Reason: Both copies must describe the same submission, including optional
  // fields. Tracking metadata belongs only in the internal notification below.
  return [
    ["Name", [lead.first_name.trim(), safeText(lead.last_name, 120)].filter(Boolean).join(" ")],
    ["Email", lead.email.trim().toLowerCase()],
    ["Phone", safeText(lead.phone, 40) || "Not provided"],
    ["Business or website", lead.business.trim()],
    ...offer.answerRows(lead),
  ];
}

function answerTableHtml(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #E8EAE9;vertical-align:top"><div style="font-size:12px;color:#6B7280;margin-bottom:4px">${escapeHtml(label)}</div><div style="font-size:15px;color:#1A1C1C;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(value)}</div></td></tr>`).join("")}</table>`;
}

function brandedEmailHtml(title: string, content: string): string {
  // Reason: Match the outreach renderer's standard email shell in
  // porter/apps/api/app/services/email_branding.py: 560px white card,
  // #2D6A4F top accent, functional sans-serif type and 56px embedded logo.
  // Each send below pairs the cid reference with the actual inline PNG.
  const font = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F6F7F6;margin:0;padding:24px 0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:8px;border-top:4px solid #2D6A4F"><tr><td style="padding:32px 32px 8px 32px;font-family:${font};font-size:15px;line-height:1.6;color:#1A1C1C"><div style="margin:0 0 20px 0"><img src="cid:porter-logo" height="56" alt="Porter" style="height:56px;width:auto;border:0;display:block"></div>${content}</td></tr><tr><td style="padding:8px 32px 28px 32px;font-family:${font};font-size:12px;line-height:1.5;color:#6B7280;border-top:1px solid #E8EAE9"><div style="padding-top:16px"><a style="color:#2D6A4F" href="https://buildwithporter.com/">buildwithporter.com</a></div></td></tr></table></td></tr></table></body></html>`;
}

export function leadConfirmationHtml(offer: ChecklistOffer, lead: ChecklistLead): string {
  // Reason (Ben, 2026-10-20): The lead asked for a checklist, not a form
  // receipt. Welcome them, explain the human follow-up, and deliver the promised
  // checklist without repeating their contact details or missing-answer labels.
  return brandedEmailHtml(offer.checklistSubject, `
    <p>Hi ${escapeHtml(lead.first_name.trim())},</p>
    <p>Thanks for getting in touch! Here’s the checklist you asked for.</p>
    <p>Take a look whenever it’s useful. If you’re behind or unsure about anything on the list, we can help you figure out where to start.</p>
    <p>Michael, our co-founder, is copied here and will follow up personally. You can also just hit reply if you have a question.</p>
    <p>Best,<br>The Porter team</p>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E8EAE9">${offer.checklistHtml()}</div>
  `);
}

export function leadNotificationHtml(offer: ChecklistOffer, lead: ChecklistLead): string {
  const details: [string, string][] = [
    ...submittedAnswerRows(offer, lead),
    // Reason: Preserve operator attribution and stable submission identity, but
    // never quote this internal-only context into the prospect's confirmation.
    ["Submission ID", lead.submission_id],
    ...UTM_KEYS.map((key): [string, string] => [key, safeText(lead[key], 200)]),
  ];
  return brandedEmailHtml(offer.notificationSubject, `
    <h1 style="font-weight:600;font-size:22px;line-height:1.3;margin:0 0 20px">${escapeHtml(offer.notificationSubject)}</h1>
    <p><strong>Internal lead notification. Do not reply to or forward this email.</strong></p>
    <p>To contact the prospect, open their confirmation email titled <strong>${escapeHtml(offer.checklistSubject)}</strong> and use <strong>Reply all</strong>. Michael is copied on that email, and support receives a blind copy. The attribution details below are for internal use only.</p>
    ${answerTableHtml(details)}
  `);
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

export type MetaDeliveryReceipt = {
  status: "accepted" | "missing_configuration" | "rejected" | "unavailable" | "invalid_response";
  event_id: string;
  attempts: number;
  http_status?: number;
  error_code?: number;
  error_subcode?: number;
};

export async function sendMetaEvent(event: MetaEvent, logLabel: string): Promise<MetaDeliveryReceipt> {
  const token = process.env.META_CAPI_TOKEN;
  // Reason: Email acceptance is independent of attribution. Missing credentials
  // must produce an operator-visible receipt instead of silently losing leads.
  const finish = (receipt: MetaDeliveryReceipt): MetaDeliveryReceipt => {
    const diagnostic = {
      ...receipt, label: logLabel, event_name: event.eventName,
      has_click_id: Boolean(event.fbc), has_browser_id: Boolean(event.fbp), has_email: Boolean(event.email),
    };
    // Reason: Stable event IDs allow reconciliation without logging email,
    // click IDs, tokens, visitor IPs, or provider messages that can echo inputs.
    if (receipt.status === "accepted") console.info("meta_conversion_delivery", diagnostic);
    else console.error("meta_conversion_delivery", diagnostic);
    return receipt;
  };
  if (!token) return finish({ status: "missing_configuration", event_id: event.eventId, attempts: 0 });
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
  // Reason: A lost response can mean Meta accepted the event. Every bounded
  // retry must retain the exact payload, event time and ID for deduplication.
  const body = JSON.stringify(payload);
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/v26.0/${META_DATASET_ID}/events`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body, signal: AbortSignal.timeout(4000),
      });
    } catch {
      if (attempt === 3) return finish({ status: "unavailable", event_id: event.eventId, attempts: attempt });
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
      continue;
    }
    let decoded: { events_received?: unknown; error?: { code?: unknown; error_subcode?: unknown; is_transient?: unknown } };
    try { decoded = await response.json() as typeof decoded; } catch {
      // Reason: Rate-limit and outage responses may be HTML; their HTTP
      // status still establishes a transient failure eligible for retry.
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 250 * attempt));
        continue;
      }
      // Reason: HTTP success without an accepted-event count is not evidence of
      // conversion delivery. Do not turn an unreadable provider body into success.
      return finish({ status: response.status === 429 || response.status >= 500 ? "unavailable" : "invalid_response", event_id: event.eventId, attempts: attempt, http_status: response.status });
    }
    if (response.ok && decoded?.events_received === 1) {
      return finish({ status: "accepted", event_id: event.eventId, attempts: attempt, http_status: response.status });
    }
    const receipt: MetaDeliveryReceipt = {
      status: response.ok ? "invalid_response" : "rejected", event_id: event.eventId,
      attempts: attempt, http_status: response.status,
      ...(typeof decoded?.error?.code === "number" ? { error_code: decoded.error.code } : {}),
      ...(typeof decoded?.error?.error_subcode === "number" ? { error_subcode: decoded.error.error_subcode } : {}),
    };
    // Reason: Invalid credentials and payloads require a correction, not retries.
    // Retry only transport failures, rate limits, server errors, or Meta's
    // explicit transient flag; the cap keeps analytics from delaying lead UX.
    const transient = response.status === 429 || response.status >= 500 || decoded?.error?.is_transient === true;
    if (!transient) return finish(receipt);
    // Reason: Exhausted transient errors leave acceptance ambiguous; reserve
    // rejected for a definitive non-transient provider refusal.
    if (attempt === 3) return finish({ ...receipt, status: "unavailable" });
    await new Promise(resolve => setTimeout(resolve, 250 * attempt));
  }
  throw new Error("Meta delivery attempts exhausted without a receipt");
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
  // Reason: The main domain belongs to a different Resend team. Keep the
  // verified updates subdomain. Resend batch cannot carry inline attachments;
  // each message therefore has its own stable key so a partially accepted
  // pair can be retried without duplicating the already accepted message.
  const messages = [
    // Reason (Ben, 2026-10-18): Michael receives the actual prospect message.
    // Reply all keeps the prospect and the original message's thread identity.
    // Reason (Ben, 2026-10-20): Support needs the customer-facing original too,
    // without exposing an additional recipient to the prospect.
    { from: "Porter <hello@updates.buildwithporter.com>", to: [email], cc: [FOLLOW_UP_EMAIL], bcc: ["support@buildwithporter.com"], subject: offer.checklistSubject, html: leadConfirmationHtml(offer, lead), reply_to: FOLLOW_UP_EMAIL },
    // Reason (Ben, 2026-10-20): Replies must not quote private attribution to
    // the prospect. Leave Reply-To absent on this internal-only notification.
    { from: "Porter <hello@updates.buildwithporter.com>", to: offer.notificationRecipients, subject: offer.notificationSubject, html: leadNotificationHtml(offer, lead) },
  ];
  for (const [index, message] of messages.entries()) {
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${offer.idempotencyPrefix}/${lead.submission_id}/${index === 0 ? "confirmation" : "notification"}` },
        body: JSON.stringify({ ...message, attachments: [{ filename: "porter-logo.png", content: PORTER_LOGO_BASE64, content_id: "porter-logo" }] }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      console.error(`${offer.label} Resend delivery unavailable`, index);
      return Response.json({ error: "Email delivery failed" }, { status: 502 });
    }
    if (!response.ok) {
      console.error(`${offer.label} Resend delivery failed`, response.status, index);
      return Response.json({ error: "Email delivery failed" }, { status: 502 });
    }
  }
  // Reason: A successful checklist delivery is the conversion. CAPI uses the
  // same event ID as fbq so Meta counts one Lead rather than two.
  const conversionEligible = conversionEligibleEmail(email);
  let metaDelivery: MetaDeliveryReceipt | undefined;
  try {
    if (conversionEligible) {
      metaDelivery = await sendMetaEvent({
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
    }
  } catch {
    // Reason: Unexpected analytics failures must not discard a delivered lead
    // or leak request/provider inputs. Keep the event identity for investigation.
    metaDelivery = { status: "unavailable", event_id: `${offer.metaLeadEventPrefix}${lead.submission_id}`, attempts: 0 };
    console.error("meta_conversion_delivery", { ...metaDelivery, label: offer.label });
  }
  return Response.json({ ok: true, conversion_eligible: conversionEligible, ...(metaDelivery ? { meta_delivery: metaDelivery } : {}) });
}
