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
  deepGenerationStatus?: "pending" | "generating" | "completed" | "failed";
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

export type AuditDocumentStatus = "uploading" | "processing" | "ready" | "failed";

export type AuditDocument = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number | null;
  status: AuditDocumentStatus;
  errorMessage: string | null;
  createdAt: string;
};

type PreparedAuditDocumentUpload = AuditDocument & {
  uploadUrl: string;
  uploadToken: string;
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

export async function generateFinancialHealthAuditDeepReview(
  auditId: string,
  auditToken: string,
): Promise<AuditRemoteSession> {
  return auditRequest({ action: "deep_review", auditId, auditToken });
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

export async function uploadFinancialHealthAuditDocument(
  auditId: string,
  auditToken: string,
  file: File,
): Promise<AuditDocument> {
  const prepared = await auditRequest<PreparedAuditDocumentUpload>({
    action: "document_prepare",
    auditId,
    auditToken,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
  // Reason: Sending a financial statement through Vercel would impose request
  // body limits and duplicate sensitive bytes in a proxy hop. The short-lived
  // target is scoped to this one Storage object and the audit bearer remains
  // required for preparation and finalization.
  const upload = await fetch(prepared.uploadUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${prepared.uploadToken}`,
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!upload.ok) {
    throw new Error("The file could not be uploaded. Try again.");
  }
  return auditRequest<AuditDocument>({
    action: "document_finalize",
    auditId,
    auditToken,
    documentId: prepared.id,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
}

export async function listFinancialHealthAuditDocuments(
  auditId: string,
  auditToken: string,
): Promise<AuditDocument[]> {
  return auditRequest<AuditDocument[]>({ action: "documents_list", auditId, auditToken });
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
