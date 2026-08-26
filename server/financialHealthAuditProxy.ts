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
  if (body.action === "email_capture" && !firstName.trim()) {
    return Response.json({ error: "First name is required" }, { status: 400 });
  }
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
    (body.action === "quickbooks_connect" || body.action === "recovery_request") &&
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
  const recoveryRequest = body.action === "recovery_request";
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
          // Reason: The API owns the canonical lead row, so proxy the first name
          // with the email instead of leaving it only in the notification path.
          ? JSON.stringify({
              email: body.email,
              first_name: firstName,
            })
        : recoveryRequest
          ? JSON.stringify({ return_url: body.returnUrl })
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
  const challengeId = start
    ? randomBytes(32).toString("base64url")
    : body.challengeId!;
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

    const target = JSON.parse(payload) as { email?: string };
    if (!target.email) {
      throw new Error("The audit API did not return a verification target");
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await sendAuditVerificationCode(target.email, code, resendKey);
      return Response.json({ challengeId }, { headers: { "Cache-Control": "no-store" } });
    }
    if (isLocalRequest(req, apiBase)) {
      // Reason: Local E2E must not send an external email. Exposing the code is
      // safe only when both the browser and the audit API are loopback hosts.
      return Response.json(
        { challengeId, developmentCode: code },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("RESEND_API_KEY is not set for financial audit recovery");
    return Response.json(
      { error: "Email verification is temporarily unavailable" },
      { status: 503 },
    );
  } catch (error) {
    console.error("Financial health audit email recovery failed", error);
    return Response.json({ error: "Email verification is temporarily unavailable" }, { status: 503 });
  }
}

async function sendAuditVerificationCode(
  email: string,
  code: string,
  apiKey: string,
): Promise<void> {
  const from = process.env.PORTER_AUDIT_FROM
    ?? process.env.RESEND_FROM
    ?? "Porter <reports@buildwithporter.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your Porter verification code`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#171a18;max-width:520px;margin:0 auto;padding:32px 20px">
          <p style="font-size:14px;margin:0 0 28px">Porter</p>
          <h1 style="font-size:26px;line-height:1.2;margin:0 0 12px">Verify your email</h1>
          <p style="font-size:16px;line-height:1.6;color:#59615c;margin:0 0 24px">Enter this code on Porter to view your saved financial health report.</p>
          <p style="font-size:34px;letter-spacing:8px;font-weight:600;margin:0 0 24px">${code}</p>
          <p style="font-size:13px;line-height:1.5;color:#7a827d;margin:0">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend rejected financial audit verification email", response.status, detail);
    throw new Error("Verification email delivery failed");
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
