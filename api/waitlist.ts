// Vercel serverless function — /api/waitlist
// Validates the public form and forwards one typed notification command to
// porter-api. Postmark credentials, recipients, templates, and sender policy
// stay exclusively in the canonical backend email boundary.

type Payload = {
  name?: string;
  email?: string;
  company?: string;
  existing_finance_team?: string;
  help_with?: string;
  source?: "financial_health_audit";
  action?: "generate_report" | "unlock_report" | "unlock_insights" | "personalized_insights_opt_in" | "book_demo";
  report_headline?: string;
  report_review_period?: string;
  report_summary?: string;
  report_findings?: string[];
  _honey?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  if (body._honey) {
    return Response.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const company = (body.company ?? "").trim();
  const existingTeam = (body.existing_finance_team ?? "").trim();
  const helpWith = (body.help_with ?? "").trim();
  const isAudit = body.source === "financial_health_audit";
  const action = isAudit ? body.action : "book_demo";
  const requiresAuditName = action === "generate_report" || action === "unlock_insights";

  if (
    !email ||
    (isAudit && requiresAuditName && !name) ||
    (!isAudit && (!name || !company))
  ) {
    return Response.json(
      {
        error: isAudit && requiresAuditName
          ? "Name and email are required"
          : isAudit
            ? "Email is required"
            : "Name, email, and company are required",
      },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (isAudit && !action) {
    return Response.json({ error: "Audit action is required" }, { status: 400 });
  }

  const apiBase = process.env.PORTER_API_URL?.replace(/\/$/, "");
  const proxyKey = process.env.PORTER_PUBLIC_AUDIT_KEY;
  if (!apiBase || !proxyKey) {
    console.error("Porter landing notification proxy is not configured");
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${apiBase}/api/public/landing-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Porter-Audit-Key": proxyKey,
        "X-Forwarded-For": originalVisitorIp(req),
      },
      // Reason: The public function owns validation and transport only. Fixed
      // recipients, subjects, templates, and Postmark policy remain in API.
      body: JSON.stringify({
        submission_id: crypto.randomUUID(),
        name,
        email,
        company,
        existing_finance_team: existingTeam,
        help_with: helpWith,
        source: isAudit ? "financial_health_audit" : undefined,
        action,
        report_headline: (body.report_headline ?? "").trim(),
        report_review_period: (body.report_review_period ?? "").trim(),
        report_summary: (body.report_summary ?? "").trim(),
        report_findings: Array.isArray(body.report_findings)
          ? body.report_findings.map((finding) => String(finding).trim()).filter(Boolean).slice(0, 10)
          : [],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await upstream.text();
    return new Response(payload, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Porter landing notification upstream failed", error);
    return Response.json({ error: "Email delivery failed" }, { status: 502 });
  }
}

function originalVisitorIp(req: Request): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    "127.0.0.1"
  );
}

export const config = { runtime: "edge" };
