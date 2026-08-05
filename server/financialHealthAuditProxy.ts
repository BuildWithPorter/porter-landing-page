type AuditProxyAction = "create" | "update" | "report" | "quickbooks_connect" | "quickbooks_status";

type AuditProxyBody = {
  action?: AuditProxyAction;
  auditId?: string;
  auditToken?: string;
  snapshot?: unknown;
};

const AUDIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleFinancialHealthAuditProxy(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: AuditProxyBody;
  try {
    body = (await req.json()) as AuditProxyBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !["create", "update", "report", "quickbooks_connect", "quickbooks_status"].includes(body.action)) {
    return Response.json({ error: "Invalid audit action" }, { status: 400 });
  }
  if (body.action !== "create" && (!body.auditId || !AUDIT_ID.test(body.auditId))) {
    return Response.json({ error: "Invalid audit ID" }, { status: 400 });
  }
  if (body.action !== "create" && (!body.auditToken || body.auditToken.length < 32)) {
    return Response.json({ error: "Audit access token is required" }, { status: 401 });
  }
  if (
    (body.action === "create" || body.action === "update") &&
    (!body.snapshot || typeof body.snapshot !== "object")
  ) {
    return Response.json({ error: "Audit snapshot is required" }, { status: 400 });
  }

  const apiBase = process.env.PORTER_API_URL?.replace(/\/$/, "");
  const proxyKey = process.env.PORTER_PUBLIC_AUDIT_KEY;
  if (!apiBase || !proxyKey) {
    console.error("Financial health audit proxy is not configured");
    return Response.json({ error: "Financial health audit is not configured" }, { status: 503 });
  }

  const basePath = "/api/public/financial-health-audits";
  const routeByAction: Record<AuditProxyAction, string> = {
    create: basePath,
    update: `${basePath}/${body.auditId}`,
    report: `${basePath}/${body.auditId}/report`,
    quickbooks_connect: `${basePath}/${body.auditId}/quickbooks/connect`,
    quickbooks_status: `${basePath}/${body.auditId}/quickbooks/status`,
  };
  const path = routeByAction[body.action];
  const method = body.action === "update" ? "PATCH" : body.action === "quickbooks_status" ? "GET" : "POST";

  try {
    const upstream = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Porter-Audit-Key": proxyKey,
        ...(body.auditToken ? { "X-Porter-Audit-Token": body.auditToken } : {}),
        "X-Forwarded-For": originalVisitorIp(req),
      },
      body:
        body.action === "create" || body.action === "update"
          ? JSON.stringify(body.snapshot)
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
