// Vercel serverless function — /api/waitlist
// Receives JSON from WaitlistDialog and relays it to support@buildwithporter.com
// via Resend. Same-origin, so no CORS to worry about.
//
// Requires env var: RESEND_API_KEY (free tier at resend.com — 3,000 emails/mo).
// Optional: RESEND_FROM (defaults to onboarding@resend.dev, which works on the
//   free tier without domain verification).
// Optional: WAITLIST_TO (defaults to support@buildwithporter.com).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Payload = {
  name?: string;
  email?: string;
  company?: string;
  existing_finance_team?: string;
  help_with?: string;
  source?: "financial_health_audit";
  action?: "unlock_report" | "unlock_insights" | "personalized_insights_opt_in" | "book_demo";
  // honeypot — silently discard if filled
  _honey?: string;
};

function escape(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — bots fill this; we 200 to avoid telling them it failed.
  if (body._honey) {
    return Response.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const company = (body.company ?? "").trim();
  const existingTeam = (body.existing_finance_team ?? "").trim();
  const helpWith = (body.help_with ?? "").trim();
  const isAuditInsightCapture =
    body.source === "financial_health_audit" &&
    (body.action === "unlock_report" || body.action === "unlock_insights" || body.action === "personalized_insights_opt_in");
  const isAuditDemoBooking = body.source === "financial_health_audit" && body.action === "book_demo";
  const isPersonalizedInsightsOptIn =
    isAuditInsightCapture && body.action === "personalized_insights_opt_in";
  const isRemainingInsightsUnlock =
    isAuditInsightCapture && body.action === "unlock_insights";

  if (
    !email ||
    (isRemainingInsightsUnlock && !name) ||
    ((!isAuditInsightCapture || isAuditDemoBooking) && (!name || !company))
  ) {
    return Response.json(
      {
        error: isRemainingInsightsUnlock
          ? "Name and email are required"
          : isAuditInsightCapture
            ? "Email is required"
            : "Name, email, and company are required",
      },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Don't leak which env var is missing; just say the server isn't ready.
    console.error("RESEND_API_KEY is not set");
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  const fromAddress = process.env.RESEND_FROM ?? "Porter Waitlist <onboarding@resend.dev>";
  const toAddress = process.env.WAITLIST_TO ?? "support@buildwithporter.com";

  const subject = isAuditInsightCapture
    ? isPersonalizedInsightsOptIn
      ? "Porter — personalized financial insights opt-in"
      : body.action === "unlock_report"
        ? "Porter — financial health audit report unlocked"
        : "Porter — financial health audit insights unlocked"
    : isAuditDemoBooking
      ? `Porter — financial health audit demo request: ${name}`
      : `Porter — new demo request: ${name}`;

  const plainBody = isAuditInsightCapture
    ? [
        "Financial Health Audit",
        ...(name ? [`Name: ${name}`] : []),
        `Email: ${email}`,
        `Action: ${isPersonalizedInsightsOptIn ? "Opted in to personalized financial insights" : body.action === "unlock_report" ? "Unlocked audit report" : "Unlocked remaining insights"}`,
      ].join("\n")
    : [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Company: ${company}`,
        `Existing finance team: ${existingTeam || "—"}`,
        "",
        `What they'd like help with:`,
        helpWith || "—",
      ].join("\n");

  const htmlBody = isAuditInsightCapture
    ? `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1C1C; line-height: 1.6; max-width: 560px;">
      <h2 style="font-family: Georgia, serif; font-weight: 400; font-size: 22px; margin: 0 0 16px; color: #1A1C1C;">Financial health audit lead</h2>
      <p style="margin: 0;">${isPersonalizedInsightsOptIn ? "This visitor explicitly opted in to personalized financial insights." : body.action === "unlock_report" ? "This visitor unlocked their financial health audit report." : "This visitor unlocked the remaining audit insights."}</p>
      ${name ? `<p style="margin: 12px 0 0;">Name: <strong>${escape(name)}</strong></p>` : ""}
      <p style="margin: 12px 0 0;">Email: <a href="mailto:${escape(email)}" style="color: #2D6A4F;">${escape(email)}</a></p>
    </div>
  `
    : `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1C1C; line-height: 1.6; max-width: 560px;">
      <h2 style="font-family: Georgia, serif; font-weight: 400; font-size: 22px; margin: 0 0 16px; color: #1A1C1C;">${isAuditDemoBooking ? "Financial health audit demo request" : "New Porter demo request"}</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #707973; width: 140px;">Name</td><td style="padding: 8px 0;"><strong>${escape(name)}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #707973;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escape(email)}" style="color: #2D6A4F;">${escape(email)}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #707973;">Company</td><td style="padding: 8px 0;">${escape(company)}</td></tr>
        <tr><td style="padding: 8px 0; color: #707973;">Existing finance team</td><td style="padding: 8px 0;">${escape(existingTeam || "—")}</td></tr>
      </table>
      ${
        helpWith
          ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 0.5px solid #BFC9C1;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #707973; margin-bottom: 8px;">What they'd like help with</div>
              <div style="font-size: 14px; white-space: pre-wrap;">${escape(helpWith)}</div>
            </div>`
          : ""
      }
    </div>
  `;

  let resendRes: Response;
  try {
    resendRes = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        reply_to: email,
        subject,
        text: plainBody,
        html: htmlBody,
      }),
    });
  } catch (err) {
    console.error("Resend network error:", err);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }

  if (!resendRes.ok) {
    const text = await resendRes.text();
    console.error("Resend non-OK:", resendRes.status, text);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}

export const config = { runtime: "edge" };
