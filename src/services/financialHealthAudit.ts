import type {
  AuditDocument,
  AuditDocumentPreflight,
  AuditRemoteSession,
  AuditSnapshot,
  FinancialHealthAuditEmailChallenge,
  QuickBooksConnectionState,
  RecoveredFinancialHealthAudit,
} from "../pages/financialHealthAuditTypes";
import { FinancialHealthAuditRequestError } from "./financialHealthAuditError";

export type {
  AuditDocument,
  AuditDocumentPreflight,
  AuditDocumentStatus,
  AuditRemoteSession,
  AuditSnapshot,
  FinancialHealthAuditEmailChallenge,
  QuickBooksConnectionState,
  QuickBooksConnectionStatus,
  RecoveredFinancialHealthAudit,
} from "../pages/financialHealthAuditTypes";

const LEGACY_QUICKBOOKS_IMPORT_ERROR = (
  "QuickBooks could not finish importing. Sign in if these books already "
  + "belong to a Porter account, or try again."
);
const QUICKBOOKS_IMPORT_ERROR = (
  "QuickBooks could not be imported. If these books are already connected to Porter, "
  + "sign in to that Porter account. Otherwise, reconnect QuickBooks and try again."
);

type PreparedAuditDocumentUpload = AuditDocument & {
  uploadUrl: string;
  uploadToken: string;
};

export async function createFinancialHealthAudit(snapshot: AuditSnapshot): Promise<AuditRemoteSession> {
  // Reason: Only creation includes the required initial contact name; ordinary
  // snapshot updates cannot rewrite the set-once email identity.
  return auditRequest({ action: "create", snapshot: {
    ...toApiSnapshot(snapshot), captured_first_name: snapshot.capturedFirstName,
  } });
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

export async function getFinancialHealthAudit(
  auditId: string,
  auditToken: string,
  signal?: AbortSignal,
): Promise<AuditRemoteSession> {
  return auditRequest({ action: "audit_status", auditId, auditToken }, signal);
}

export async function waitForFinancialHealthAudit(
  auditId: string,
  auditToken: string,
  signal?: AbortSignal,
  onProgress?: (session: AuditRemoteSession) => void,
): Promise<AuditRemoteSession> {
  const deadline = Date.now() + 10 * 60_000;
  let delayMs = 2_000;
  while (Date.now() < deadline) {
    const remote = await getFinancialHealthAudit(auditId, auditToken, signal);
    onProgress?.(remote);
    if (remote.status === "completed" && remote.report) return remote;
    if (remote.status === "failed") {
      throw new Error("Porter could not finish this report. Try generating it again.");
    }
    // Reason: Generation is a porter-api request path, not a sync_jobs worker.
    // Polling remains as recovery for legacy generating sessions or retry
    // races, and backoff keeps proxy and database traffic bounded.
    await abortableDelay(document.visibilityState === "hidden" ? 5_000 : delayMs, signal);
    delayMs = Math.min(5_000, delayMs + 500);
  }
  throw new Error("Porter is still working on this report. Return to this tab in a moment.");
}

export async function captureFinancialHealthAuditEmail(
  auditId: string,
  auditToken: string,
  email: string,
): Promise<AuditRemoteSession> {
  // Reason: The intake form asks for an email and nothing else. The backend
  // still accepts an optional firstName so an older bundle keeps working, but
  // this client no longer collects or sends one.
  return auditRequest({
    action: "email_capture",
    auditId,
    auditToken,
    email,
  });
}

export async function notifyFinancialHealthAuditReportStarted(
  submissionId: string,
  email: string,
): Promise<void> {
  // Reason: Keep the controller on typed audit commands. This best-effort
  // operator notification is transport, not workflow or report state.
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      submission_id: submissionId,
      email,
      source: "financial_health_audit",
      action: "generate_report",
    }),
  });
  if (!response.ok) throw new Error("The report-start notification was not accepted.");
}

export async function requestFinancialHealthAuditRecovery(
  auditId: string,
  auditToken: string,
): Promise<{ state: string }> {
  return auditRequest<{ state: string }>({
    action: "recovery_request",
    auditId,
    auditToken,
  });
}

export async function startFinancialHealthAuditEmailRecovery(
  recoveryState: string,
): Promise<FinancialHealthAuditEmailChallenge> {
  return auditRequest<FinancialHealthAuditEmailChallenge>({
    action: "recovery_email_start",
    recoveryState,
  });
}

export async function verifyFinancialHealthAuditEmailRecovery(
  challengeId: string,
  code: string,
): Promise<RecoveredFinancialHealthAudit> {
  return auditRequest<RecoveredFinancialHealthAudit>({
    action: "recovery_email_verify",
    challengeId,
    code,
  });
}

export async function startFinancialHealthQuickBooksConnection(
  auditId: string,
  auditToken: string,
  returnUrl: string,
): Promise<{ authUrl: string | null }> {
  return auditRequest({ action: "quickbooks_connect", auditId, auditToken, returnUrl });
}

export async function getFinancialHealthQuickBooksConnection(
  auditId: string,
  auditToken: string,
  signal?: AbortSignal,
): Promise<QuickBooksConnectionState> {
  return auditRequest({ action: "quickbooks_status", auditId, auditToken }, signal);
}

export async function waitForFinancialHealthQuickBooksConnection(
  auditId: string, auditToken: string, signal?: AbortSignal,
): Promise<QuickBooksConnectionState> {
  // Reason: OAuth redirects before canonical ledger ingestion finishes. Poll
  // the existing connection status, not generation, so a quick questionnaire
  // cannot race import readiness and produce an avoidable failed report.
  const deadline = Date.now() + 30 * 60_000;
  while (Date.now() < deadline) {
    const connection = await getFinancialHealthQuickBooksConnection(auditId, auditToken, signal);
    if (connection.status === "connected") return connection;
    if (connection.status !== "pending") {
      const persistedError = connection.errorMessage?.trim();
      throw new Error(
        !persistedError || persistedError === LEGACY_QUICKBOOKS_IMPORT_ERROR
          ? QUICKBOOKS_IMPORT_ERROR
          : persistedError,
      );
    }
    await abortableDelay(5_000, signal);
  }
  throw new Error("QuickBooks is taking longer than expected. Please try again.");
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
    sizeBytes: file.size,
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
    sizeBytes: file.size,
  });
}

export async function listFinancialHealthAuditDocuments(
  auditId: string,
  auditToken: string,
  signal?: AbortSignal,
): Promise<AuditDocument[]> {
  return auditRequest<AuditDocument[]>({ action: "documents_list", auditId, auditToken }, signal);
}

export async function preflightFinancialHealthAuditDocuments(
  auditId: string,
  auditToken: string,
): Promise<AuditDocumentPreflight> {
  // Reason: The backend owns extraction readiness; the shared audit skill
  // assesses the evidence instead of a browser-side financial parser.
  return auditRequest<AuditDocumentPreflight>({
    action: "documents_preflight",
    auditId,
    auditToken,
  });
}

export async function waitForFinancialHealthAuditDocuments(
  auditId: string,
  auditToken: string,
  signal?: AbortSignal,
  onProgress?: (documents: AuditDocument[]) => void,
  stillIncoming?: () => boolean,
): Promise<AuditDocument[]> {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const documents = await listFinancialHealthAuditDocuments(auditId, auditToken, signal);
    onProgress?.(documents);
    // Reason: A failed direct PUT leaves its reservation marked uploading until
    // backend cleanup. Browser-local uploads and finalized processing rows are
    // the only work that can still become report evidence during this wait.
    const inFlight =
      stillIncoming?.() === true ||
      documents.some((document) => document.status === "processing");
    if (!inFlight) {
      if (!documents.some((document) => document.status === "ready")) {
        throw new Error("Porter could not read the uploaded files. Add another file and try again.");
      }
      return documents;
    }
    // Reason: Extraction is the first wait-screen stage. Poll here instead of
    // calling generate, which would lock the audit and drop unread files.
    await abortableDelay(document.visibilityState === "hidden" ? 5_000 : 2_000, signal);
  }
  throw new Error("Porter is still reading your files. Return to this tab in a moment.");
}

function toApiSnapshot(snapshot: AuditSnapshot) {
  return {
    step_id: snapshot.stepId,
    path: snapshot.path,
    answers: snapshot.answers,
    captured_email: snapshot.capturedEmail ?? null,
  };
}

async function auditRequest<T = AuditRemoteSession>(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/financial-health-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const body = (await response.json().catch(() => null)) as
    | AuditRemoteSession
    | {
        error?: string;
        message?: string;
        detail?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };
      }
    | null;
  if (!response.ok) {
    const structuredDetail = body && "detail" in body ? body.detail : undefined;
    const message =
      structuredDetail
        ? structuredDetail.message
        : body && "error" in body
          ? body.error
          : body && "message" in body
            ? body.message
          : undefined;
    // Reason: Callers must distinguish an intentionally masked stale bearer
    // from a real generation/import failure without parsing user-facing copy.
    throw new FinancialHealthAuditRequestError(
      message || "The financial health audit is temporarily unavailable.",
      response.status,
      structuredDetail?.code ?? null,
      structuredDetail?.details ?? null,
    );
  }
  return body as T;
}

function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The report request was cancelled.", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("The report request was cancelled.", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
