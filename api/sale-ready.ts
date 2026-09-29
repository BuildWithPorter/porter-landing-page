import { SALE_READY_CHECKLIST } from "../src/content/saleReadyChecklist";

type Lead = {
  submission_id: string;
  first_name: string;
  email: string;
  timeframe: string;
  books_status: string;
  help_with: string[];
  page_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  meta_fbp?: string;
  meta_fbc?: string;
};

const TIMEFRAMES = new Set(["In the next 6 months", "6 to 12 months", "12 to 24 months", "Not sure yet"]);
const BOOKS_STATUS = new Set(["Up to date", "One or two months behind", "Three or more months behind", "Not sure"]);
const HELP = new Set(["Catch up missing months", "Tie books to bank statements", "Prepare numbers for buyers", "Keep books current through closing"]);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  return typeof lead.submission_id === "string" && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(lead.submission_id)
    && typeof lead.first_name === "string" && lead.first_name.trim().length > 0 && lead.first_name.length <= 120
    && typeof lead.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) && lead.email.length <= 320
    && TIMEFRAMES.has(String(lead.timeframe)) && BOOKS_STATUS.has(String(lead.books_status))
    && Array.isArray(lead.help_with) && lead.help_with.every(x => HELP.has(String(x)));
}

function checklistHtml(): string {
  const items = SALE_READY_CHECKLIST.map(([title, detail]) => `<li style="margin:0 0 14px"><strong>${escapeHtml(title)}</strong>${detail ? ` ${escapeHtml(detail)}` : ""}</li>`).join("");
  return `<div style="max-width:660px;margin:auto;font-family:Georgia,serif;color:#0c211a"><h1>The Sale-Ready Books Checklist</h1><p><em>Ten things a buyer's accountant checks first</em></p><ol>${items}</ol><p>Porter cleans up your books in less than 2 weeks and keeps them current until you close.</p><p><a href="https://buildwithporter.com/sale-ready">buildwithporter.com/sale-ready</a></p></div>`;
}

async function sendMetaLead(lead: Lead, visitorIp: string, userAgent: string): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;
  const emailHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(lead.email.trim().toLowerCase()));
  const em = Array.from(new Uint8Array(emailHash), byte => byte.toString(16).padStart(2, "0")).join("");
  const payload = { data: [{ event_name: "Lead", event_time: Math.floor(Date.now() / 1000), event_id: `sale_ready_lead_${lead.submission_id}`, action_source: "website", event_source_url: safeText(lead.page_url, 1000) || "https://buildwithporter.com/sale-ready", user_data: { em: [em], client_ip_address: visitorIp, client_user_agent: userAgent, fbp: safeText(lead.meta_fbp, 300) || undefined, fbc: safeText(lead.meta_fbc, 300) || undefined } }] };
  const response = await fetch("https://graph.facebook.com/v26.0/1383684593949468/events", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (!response.ok) console.error("Sale-Ready Meta CAPI delivery failed", response.status);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  let decoded: unknown;
  try { decoded = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!validLead(decoded)) return Response.json({ error: "Please complete the form" }, { status: 400 });
  const lead = decoded;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Sale-Ready Resend key is not configured");
    return Response.json({ error: "Email delivery unavailable" }, { status: 503 });
  }
  const email = lead.email.trim().toLowerCase();
  const firstName = lead.first_name.trim();
  const attribution = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
  const details = [
    ["Name", firstName], ["Email", email], ["Selling timeframe", lead.timeframe], ["Books status", lead.books_status], ["Help wanted", lead.help_with.join(", ") || "No selection"],
    ...attribution.map(key => [key, safeText(lead[key], 200)]),
  ];
  const internalHtml = `<h1>New Sale-Ready Books lead</h1><dl>${details.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
  // Reason: The main domain belongs to a different Resend team. Send from the
  // separately verified updates subdomain so this campaign cannot claim or
  // disrupt that team's existing mail configuration. One idempotent batch keeps
  // the checklist and lead notification paired across ambiguous network retries.
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `sale-ready/${lead.submission_id}` },
    body: JSON.stringify([
      { from: "Porter <hello@updates.buildwithporter.com>", to: [email], subject: "Your Sale-Ready Books Checklist", html: checklistHtml(), reply_to: "support@buildwithporter.com" },
      { from: "Porter <hello@updates.buildwithporter.com>", to: ["support@buildwithporter.com", "michael@buildwithporter.com"], subject: "New Sale-Ready Books lead", html: internalHtml, reply_to: email },
    ]),
  });
  if (!response.ok) {
    console.error("Sale-Ready Resend delivery failed", response.status);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }
  // Reason: A successful checklist delivery is the conversion. CAPI uses the
  // same event ID as fbq so Meta counts one Lead rather than two.
  try { await sendMetaLead(lead, request.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0] || "", request.headers.get("user-agent") || ""); } catch (error) { console.error("Sale-Ready Meta CAPI unavailable", error); }
  return Response.json({ ok: true });
}

export const config = { runtime: "edge" };
