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
  // #2D6A4F top accent, functional sans-serif type and compact wordmark.
  // Resend batch does not support inline attachments, so use that renderer's
  // text-wordmark treatment rather than a broken cid or expiring logo URL.
  const font = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F6F7F6;margin:0;padding:24px 0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:8px;border-top:4px solid #2D6A4F"><tr><td style="padding:32px 32px 8px 32px;font-family:${font};font-size:15px;line-height:1.6;color:#1A1C1C"><div style="font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#2D6A4F;margin:0 0 20px 0">Porter</div>${content}</td></tr><tr><td style="padding:8px 32px 28px 32px;font-family:${font};font-size:12px;line-height:1.5;color:#6B7280;border-top:1px solid #E8EAE9"><div style="padding-top:16px"><a style="color:#2D6A4F" href="https://buildwithporter.com/">buildwithporter.com</a></div></td></tr></table></td></tr></table></body></html>`;
}

export function leadConfirmationHtml(offer: ChecklistOffer, lead: ChecklistLead): string {
  return brandedEmailHtml(offer.checklistSubject, `
    <h1 style="font-weight:600;font-size:22px;line-height:1.3;margin:0 0 20px">Thanks for reaching out about ${escapeHtml(offer.label)}.</h1>
    <p>Hi ${escapeHtml(lead.first_name.trim())},</p>
    <p>We received your request. Your checklist is below, along with a copy of what you shared with Porter.</p>
    <p>Michael, Porter's co-founder, is copied here so you can continue the conversation in this email. Reply whenever you're ready, or if you'd like to add anything.</p>
    <h2 style="font-size:18px;margin:28px 0 4px">Your answers</h2>
    ${answerTableHtml(submittedAnswerRows(offer, lead))}
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
    <p><strong>Follow up in the confirmation email.</strong> Michael is copied on the prospect's email titled <strong>${escapeHtml(offer.checklistSubject)}</strong>. Open that message and use <strong>Reply all</strong> to continue the same conversation with the prospect.</p>
    <p>This separate internal notification includes attribution details. Do not forward it as the prospect's confirmation.</p>
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
  // Reason: The main domain belongs to a different Resend team. Send from the
  // separately verified updates subdomain so this campaign cannot claim or
  // disrupt that team's existing mail configuration. One idempotent batch keeps
  // the checklist and lead notification paired across ambiguous network retries.
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${offer.idempotencyPrefix}/${lead.submission_id}` },
    body: JSON.stringify([
      // Reason (Ben, 2026-10-18): CC Michael on the actual customer message,
      // rather than trying to thread independently sent emails by subject.
      // The prospect's Reply reaches Michael; Michael's Reply all retains the
      // prospect in To and the original Message-ID in the mail client's reply.
      { from: "Porter <hello@updates.buildwithporter.com>", to: [email], cc: [FOLLOW_UP_EMAIL], subject: offer.checklistSubject, html: leadConfirmationHtml(offer, lead), reply_to: FOLLOW_UP_EMAIL },
      { from: "Porter <hello@updates.buildwithporter.com>", to: offer.notificationRecipients, subject: offer.notificationSubject, html: leadNotificationHtml(offer, lead), reply_to: email },
    ]),
  });
  if (!response.ok) {
    console.error(`${offer.label} Resend delivery failed`, response.status);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
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
