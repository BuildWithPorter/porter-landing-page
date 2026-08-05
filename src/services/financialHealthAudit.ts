import type { AuditAnswers, AuditPath, AuditReport } from "../pages/financialHealthAuditFlow";

export type AuditSnapshot = {
  stepId: string;
  path: AuditPath | null;
  answers: AuditAnswers;
};

type AuditRemoteSession = {
  id: string;
  status: "in_progress" | "generating" | "completed" | "failed";
  report: AuditReport | null;
  accessToken?: string;
  connectionStatus?: QuickBooksConnectionStatus;
  qboCompanyName?: string | null;
  qboConnectedAt?: string | null;
};

export type QuickBooksConnectionStatus = "not_started" | "pending" | "connected" | "failed";

export type QuickBooksConnectionState = {
  status: QuickBooksConnectionStatus;
  companyName: string | null;
  connectedAt: string | null;
};

export async function createFinancialHealthAudit(snapshot: AuditSnapshot): Promise<AuditRemoteSession> {
  return auditRequest({ action: "create", snapshot: toApiSnapshot(snapshot) });
}

export async function updateFinancialHealthAudit(
  auditId: string,
  auditToken: string,
  snapshot: AuditSnapshot,
): Promise<AuditRemoteSession> {
  return auditRequest({ action: "update", auditId, auditToken, snapshot: toApiSnapshot(snapshot) });
}

export async function generateFinancialHealthAudit(
  auditId: string,
  auditToken: string,
): Promise<AuditRemoteSession> {
  return auditRequest({ action: "report", auditId, auditToken });
}

export async function startFinancialHealthQuickBooksConnection(
  auditId: string,
  auditToken: string,
): Promise<{ authUrl: string }> {
  return auditRequest({ action: "quickbooks_connect", auditId, auditToken });
}

export async function getFinancialHealthQuickBooksConnection(
  auditId: string,
  auditToken: string,
): Promise<QuickBooksConnectionState> {
  return auditRequest({ action: "quickbooks_status", auditId, auditToken });
}

function toApiSnapshot(snapshot: AuditSnapshot) {
  return {
    step_id: snapshot.stepId,
    path: snapshot.path,
    answers: snapshot.answers,
  };
}

async function auditRequest<T = AuditRemoteSession>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/financial-health-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | AuditRemoteSession
    | { error?: string; detail?: { message?: string } }
    | null;
  if (!response.ok) {
    const message =
      body && "detail" in body
        ? body.detail?.message
        : body && "error" in body
          ? body.error
          : undefined;
    throw new Error(message || "The financial health audit is temporarily unavailable.");
  }
  return body as T;
}
