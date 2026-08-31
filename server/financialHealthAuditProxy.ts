import { createHmac, randomBytes, randomInt } from "node:crypto";

type AuditProxyAction =
  | "create"
  | "update"
  | "report"
  | "audit_status"
  | "email_capture"
  | "recovery_request"
  | "recovery_email_start"
  | "recovery_email_verify"
  | "quickbooks_connect"
  | "quickbooks_status"
  | "document_prepare"
  | "document_finalize"
  | "documents_preflight"
  | "documents_list";

type AuditProxyBody = {
  action?: AuditProxyAction;
  auditId?: string;
  auditToken?: string;
  snapshot?: unknown;
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  email?: string;
  firstName?: string;
  first_name?: string;
  documentId?: string;
  returnUrl?: string;
  recoveryState?: string;
  challengeId?: string;
  code?: string;
};

export type FinancialHealthAuditProxyConfig = {
  apiBase?: string;
  proxyKey?: string;
};

const AUDIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleFinancialHealthAuditProxy(
  req: Request,
  config: FinancialHealthAuditProxyConfig = {},
): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: AuditProxyBody;
  try {
    body = (await req.json()) as AuditProxyBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || ![
    "create",
    "update",
    "report",
    "audit_status",
    "email_capture",
    "recovery_request",
    "recovery_email_start",
    "recovery_email_verify",
    "quickbooks_connect",
    "quickbooks_status",
    "document_prepare",
    "document_finalize",
    "documents_preflight",
    "documents_list",
  ].includes(body.action)) {
    return Response.json({ error: "Invalid audit action" }, { status: 400 });
  }
  const recoveryEmailStart = body.action === "recovery_email_start";
  const recoveryEmailVerify = body.action === "recovery_email_verify";
  // Reason: Public report recovery must stay on landing through the email-code
  // challenge. The removed OAuth actions redirected visitors into the Porter
  // app and are intentionally not accepted by this public proxy.
  const recoveryAction = recoveryEmailStart || recoveryEmailVerify;
  if (body.action !== "create" && !recoveryAction && (!body.auditId || !AUDIT_ID.test(body.auditId))) {
    return Response.json({ error: "Invalid audit ID" }, { status: 400 });
  }
  if (body.action !== "create" && !recoveryAction && (!body.auditToken || body.auditToken.length < 32)) {
    return Response.json({ error: "Audit access token is required" }, { status: 401 });
  }
  if (body.action === "email_capture" && (!body.email || typeof body.email !== "string")) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }
  const firstName = typeof body.firstName === "string"
    ? body.firstName
    : typeof body.first_name === "string"
      ? body.first_name
      : "";
  if (
    recoveryEmailStart &&
    (!body.recoveryState || body.recoveryState.length < 32)
  ) {
    return Response.json({ error: "Report recovery state is required" }, { status: 400 });
  }
  if (
    recoveryEmailVerify &&
    (!body.challengeId || body.challengeId.length < 32 || !/^\d{6}$/.test(body.code ?? ""))
  ) {
    return Response.json({ error: "Enter the 6-digit verification code" }, { status: 400 });
  }
  if (
    body.action === "document_prepare" &&
    (!body.filename ||
      typeof body.filename !== "string" ||
      !Number.isSafeInteger(body.sizeBytes) ||
      body.sizeBytes! < 0)
  ) {
    return Response.json({ error: "A file name is required" }, { status: 400 });
  }
  if (body.action === "document_finalize" && (!body.documentId || !AUDIT_ID.test(body.documentId))) {
    return Response.json({ error: "Invalid document ID" }, { status: 400 });
  }
  if (
    body.action === "document_finalize" &&
    (!body.filename ||
      typeof body.filename !== "string" ||
      typeof body.contentType !== "string" ||
      !Number.isSafeInteger(body.sizeBytes) ||
      body.sizeBytes! < 0)
  ) {
    return Response.json({ error: "File metadata is required" }, { status: 400 });
  }
  if (
    (body.action === "create" || body.action === "update") &&
    (!body.snapshot || typeof body.snapshot !== "object")
  ) {
    return Response.json({ error: "Audit snapshot is required" }, { status: 400 });
  }
  if (
    body.action === "quickbooks_connect" &&
    typeof body.returnUrl !== "string"
  ) {
    return Response.json({ error: "Invalid return URL" }, { status: 400 });
  }

  const apiBase = (config.apiBase ?? process.env.PORTER_API_URL)?.replace(/\/$/, "");
  const proxyKey = config.proxyKey ?? process.env.PORTER_PUBLIC_AUDIT_KEY;
  if (!apiBase || !proxyKey) {
    console.error("Financial health audit proxy is not configured");
    return Response.json({ error: "Financial health audit is not configured" }, { status: 503 });
  }

  const basePath = "/api/public/financial-health-audits";

  if (recoveryEmailStart || recoveryEmailVerify) {
    return handleEmailRecovery({
      req,
      body,
      apiBase,
      proxyKey,
      basePath,
      start: recoveryEmailStart,
    });
  }

  const routeByAction: Record<AuditProxyAction, string> = {
    create: basePath,
    update: `${basePath}/${body.auditId}`,
    report: `${basePath}/${body.auditId}/report`,
    audit_status: `${basePath}/${body.auditId}`,
    email_capture: `${basePath}/${body.auditId}/email`,
    recovery_request: `${basePath}/${body.auditId}/recovery/request`,
    recovery_email_start: `${basePath}/recovery/email/start`,
    recovery_email_verify: `${basePath}/recovery/email/verify`,
    quickbooks_connect: `${basePath}/${body.auditId}/quickbooks/connect`,
    quickbooks_status: `${basePath}/${body.auditId}/quickbooks/status`,
    document_prepare: `${basePath}/${body.auditId}/documents/prepare`,
    document_finalize: `${basePath}/${body.auditId}/documents/${body.documentId}/finalize`,
    documents_preflight: `${basePath}/${body.auditId}/documents/preflight`,
    documents_list: `${basePath}/${body.auditId}/documents`,
  };
  const path = routeByAction[body.action];
  const method = body.action === "update"
    ? "PATCH"
    : body.action === "audit_status" || body.action === "quickbooks_status" || body.action === "documents_list"
      ? "GET"
      : "POST";
  const snapshotAction = body.action === "create" || body.action === "update";
  const documentPrepare = body.action === "document_prepare";
  const documentFinalize = body.action === "document_finalize";
  const emailCapture = body.action === "email_capture";
  const quickBooksConnect = body.action === "quickbooks_connect";
  // Reason: Report generation now returns a short 202 handoff and continues in
  // porter-api BackgroundTasks. The browser polls status separately, so holding
  // this proxy request for the full AI run would only hide a broken handoff.
  const timeoutMs = 55_000;

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Porter-Audit-Key": proxyKey,
        ...(body.auditToken ? { "X-Porter-Audit-Token": body.auditToken } : {}),
        "X-Forwarded-For": originalVisitorIp(req),
      },
      body: snapshotAction
        ? JSON.stringify(body.snapshot)
        : emailCapture
          // Reason: The intake form asks for an email only. The API accepts an
          // optional first_name, so a name is forwarded when an older bundle
          // still sends one and omitted otherwise. This proxy used to REJECT a
          // nameless capture with 400 "First name is required", which silently
          // broke the email-only form: the browser stayed on the lead screen
          // with no visible error while the audit row had already been created.
          ? JSON.stringify(
              firstName.trim()
                ? { email: body.email, first_name: firstName }
                : { email: body.email },
            )
          : quickBooksConnect && body.returnUrl
            ? JSON.stringify({ return_url: body.returnUrl })
            : documentPrepare
              ? JSON.stringify({
                  filename: body.filename,
                  content_type: body.contentType,
                  size_bytes: body.sizeBytes,
                })
              : documentFinalize
                ? JSON.stringify({
                    filename: body.filename,
                    content_type: body.contentType,
                    size_bytes: body.sizeBytes,
                  })
                : undefined,
      signal: AbortSignal.timeout(timeoutMs),
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
    console.error("Financial health audit upstream failed", error);
    return Response.json({ error: "Financial health audit is temporarily unavailable" }, { status: 503 });
  }
}

async function handleEmailRecovery({
  req,
  body,
  apiBase,
  proxyKey,
  basePath,
  start,
}: {
  req: Request;
  body: AuditProxyBody;
  apiBase: string;
  proxyKey: string;
  basePath: string;
  start: boolean;
}): Promise<Response> {
  const challengeId = start ? randomBytes(32).toString("base64url") : body.challengeId!;

  if (start && !isLocalRequest(req, apiBase)) {
    try {
      const upstream = await fetch(`${apiBase}${basePath}/recovery/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Porter-Audit-Key": proxyKey,
          "X-Forwarded-For": originalVisitorIp(req),
        },
        // Reason: The API owns code generation, recipient selection, and the
        // Postmark credential. Landing supplies only an opaque attempt id so it
        // cannot become a second email-delivery policy surface.
        body: JSON.stringify({
          state: body.recoveryState,
          challenge_id: challengeId,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const payload = await upstream.text();
      if (!upstream.ok && upstream.status >= 500) {
        // Reason: A provider/network failure can occur after Postmark accepted
        // the message. Preserve the challenge so an email that arrives remains
        // usable; an explicit send-another-code action creates a fresh attempt.
        return Response.json(
          { challengeId, deliveryStatus: "ambiguous" },
          { status: 202, headers: { "Cache-Control": "no-store" } },
        );
      }
      return new Response(payload, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("Financial health audit email delivery outcome is ambiguous", error);
      return Response.json(
        { challengeId, deliveryStatus: "ambiguous" },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // Reason: Local E2E must not send an external email. The loopback-only path
  // keeps the established digest contract while production sends exclusively
  // from the API's Postmark boundary.
  const code = start
    ? randomInt(0, 1_000_000).toString().padStart(6, "0")
    : body.code!;
  const codeDigest = createHmac("sha256", proxyKey)
    .update(`${challengeId}:${code}`)
    .digest("hex");
  const path = start
    ? `${basePath}/recovery/email/start`
    : `${basePath}/recovery/email/verify`;

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Porter-Audit-Key": proxyKey,
        "X-Forwarded-For": originalVisitorIp(req),
      },
      body: JSON.stringify(start
        ? {
            state: body.recoveryState,
            challenge_id: challengeId,
            code_digest: codeDigest,
          }
        : {
            challenge_id: challengeId,
            code_digest: codeDigest,
          }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await upstream.text();
    if (!upstream.ok || !start) {
      return new Response(payload, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    if (isLocalRequest(req, apiBase)) {
      return Response.json(
        { challengeId, developmentCode: code },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    throw new Error("Non-local email delivery bypassed the Postmark endpoint");
  } catch (error) {
    console.error("Financial health audit email recovery failed", error);
    return Response.json({ error: "Email verification is temporarily unavailable" }, { status: 503 });
  }
}

function isLocalRequest(req: Request, apiBase: string): boolean {
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  return localHosts.has(new URL(req.url).hostname) && localHosts.has(new URL(apiBase).hostname);
}

function originalVisitorIp(req: Request): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    "127.0.0.1"
  );
}
