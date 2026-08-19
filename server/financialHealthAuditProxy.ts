type AuditProxyAction =
  | "create"
  | "update"
  | "report"
  | "audit_status"
  | "email_capture"
  | "quickbooks_connect"
  | "quickbooks_status"
  | "document_prepare"
  | "document_finalize"
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
  documentId?: string;
  returnUrl?: string;
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
    "quickbooks_connect",
    "quickbooks_status",
    "document_prepare",
    "document_finalize",
    "documents_list",
  ].includes(body.action)) {
    return Response.json({ error: "Invalid audit action" }, { status: 400 });
  }
  if (body.action !== "create" && (!body.auditId || !AUDIT_ID.test(body.auditId))) {
    return Response.json({ error: "Invalid audit ID" }, { status: 400 });
  }
  if (body.action !== "create" && (!body.auditToken || body.auditToken.length < 32)) {
    return Response.json({ error: "Audit access token is required" }, { status: 401 });
  }
  if (body.action === "email_capture" && (!body.email || typeof body.email !== "string")) {
    return Response.json({ error: "Email is required" }, { status: 400 });
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
    body.returnUrl !== undefined &&
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
  const routeByAction: Record<AuditProxyAction, string> = {
    create: basePath,
    update: `${basePath}/${body.auditId}`,
    report: `${basePath}/${body.auditId}/report`,
    audit_status: `${basePath}/${body.auditId}`,
    email_capture: `${basePath}/${body.auditId}/email`,
    quickbooks_connect: `${basePath}/${body.auditId}/quickbooks/connect`,
    quickbooks_status: `${basePath}/${body.auditId}/quickbooks/status`,
    document_prepare: `${basePath}/${body.auditId}/documents/prepare`,
    document_finalize: `${basePath}/${body.auditId}/documents/${body.documentId}/finalize`,
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
          ? JSON.stringify({ email: body.email })
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
      signal: AbortSignal.timeout(55_000),
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

function originalVisitorIp(req: Request): string {
  return (
    req.headers.get("x-vercel-forwarded-for") ??
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    "127.0.0.1"
  );
}
