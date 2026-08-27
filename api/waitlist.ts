// Vercel serverless function — /api/waitlist
// Validates the public form and forwards one typed notification command to
// porter-api. Postmark credentials, recipients, templates, and sender policy
// stay exclusively in the canonical backend email boundary.

type Payload = {
  submission_id: string;
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

const AUDIT_ACTIONS = new Set<NonNullable<Payload["action"]>>([
  "generate_report",
  "unlock_report",
  "unlock_insights",
  "personalized_insights_opt_in",
  "book_demo",
]);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function trimmedString(value: unknown) {
  // Reason: req.json() is untrusted at runtime even though Payload documents
  // the intended shape. Normalize wrong scalar types into validation failures.
  return typeof value === "string" ? value.trim() : "";
}

function isValidSubmissionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  const submissionId = trimmedString(body.submission_id);
  if (!isValidSubmissionId(submissionId)) {
    // Reason: The browser owns one stable id per submit/retry cycle. Minting it
    // here would give a timed-out retry a new backend receipt and duplicate mail.
    return Response.json({ error: "Invalid submission ID" }, { status: 400 });
  }

  const name = trimmedString(body.name);
  const email = trimmedString(body.email);
  const company = trimmedString(body.company);
  const existingTeam = trimmedString(body.existing_finance_team);
  const helpWith = trimmedString(body.help_with);
  const isAudit = body.source === "financial_health_audit";
  const requestedAction = body.action;
  if (isAudit && (!requestedAction || !AUDIT_ACTIONS.has(requestedAction))) {
    // Reason: JSON casts do not enforce the TypeScript union at runtime. Reject
    // unknown commands here so the public adapter cannot probe backend behavior.
    return Response.json({ error: "Invalid audit action" }, { status: 400 });
  }
  const action = isAudit ? requestedAction : "book_demo";
  const requiresAuditName = action === "generate_report" || action === "unlock_insights";
  const requiresDemoIdentity = action === "book_demo";

  if (
    !email ||
    (isAudit && requiresAuditName && !name) ||
    (requiresDemoIdentity && (!name || !company))
  ) {
    return Response.json(
      {
        error: requiresDemoIdentity
          ? "Name, email, and company are required"
          : isAudit && requiresAuditName
          ? "Name and email are required"
          : "Email is required",
      },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
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
        submission_id: submissionId,
        name,
        email,
        company,
        existing_finance_team: existingTeam,
        help_with: helpWith,
        source: isAudit ? "financial_health_audit" : undefined,
        action,
        ...(isAudit
          ? {
              report_headline: trimmedString(body.report_headline),
              report_review_period: trimmedString(body.report_review_period),
              report_summary: trimmedString(body.report_summary),
              report_findings: Array.isArray(body.report_findings)
                ? body.report_findings.map((finding) => String(finding).trim()).filter(Boolean).slice(0, 10)
                : [],
            }
          : {}),
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
  // Reason: Vercel owns this header on the deployed server boundary. A generic
  // x-forwarded-for value is client-spoofable here; group missing-header traffic
  // conservatively instead of inventing a loopback visitor.
  return req.headers.get("x-vercel-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown";
}

export const config = { runtime: "edge" };
