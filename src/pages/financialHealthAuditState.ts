import type {
  AuditDocument,
  AuditRemoteSession,
  QuickBooksConnectionStatus,
  RecoveredFinancialHealthAudit,
} from "./financialHealthAuditTypes.ts";
import {
  FLOWS,
  SHARED_FLOW,
  STEPS,
  canContinue,
  type AuditAnswers,
  type AuditPath,
  type AuditReport,
  type NarratedFinding,
} from "./financialHealthAuditFlow.ts";

// Pure workflow authority: accepted events, screen selection, and durable
// storage projection live here. Network and browser effects live in the hook.

export type AuditSessionState = {
  stepId: string;
  path: AuditPath | null;
  answers: AuditAnswers;
  auditId: string | null;
  auditToken: string | null;
  report: AuditReport | null;
  capturedEmail: string | null;
  capturedFirstName: string | null;
};

export type QuickBooksState =
  | { phase: "idle" }
  | { phase: "starting"; localAttemptKey: string }
  | { phase: "authorizing"; localAttemptKey: string }
  | { phase: "pending"; localAttemptKey: string }
  | { phase: "connected"; companyName: string | null; localAttemptKey: string }
  | {
      phase: "failed";
      error: string;
      failureStage: "authorization" | "import";
      localAttemptKey: string;
    };

export type ReportPhase = "idle" | "generating" | "error";
export type ReportProgress = "saving" | "reading" | "analyzing";
export type ReportRecovery = "retry" | "quickbooks";
export type RecoverySession = { state: string; email: string };

type RequestState = {
  hydration: string | null;
  save: string | null;
  upload: string | null;
  preflight: string | null;
  report: {
    requestId: string;
    durableRevision: number;
    sourceRevision: number;
  } | null;
  recovery: string | null;
};

export type AuditControllerState = {
  session: AuditSessionState;
  quickBooks: QuickBooksState;
  callbackNotice: string;
  leadCapture: "required" | "submitting" | "complete";
  hydration: "boot" | "ready";
  epoch: number;
  durableRevision: number;
  quickBooksRevision: number;
  sourceRevision: number;
  requests: RequestState;
  report: {
    phase: ReportPhase;
    progress: ReportProgress;
    thinking: string;
    error: string;
    recovery: ReportRecovery;
  };
  documents: {
    items: AuditDocument[];
    error: string;
    uploadActive: boolean;
    preflightActive: boolean;
  };
  validationMessage: string;
  recovery: { session: RecoverySession | null; error: string };
};

export type AuditScreen =
  | "boot"
  | "recovery"
  | "report"
  | "quickbooks-error"
  | "lead"
  | "report-pending"
  | "questionnaire";

export const INITIAL_AUDIT_SESSION: AuditSessionState = {
  stepId: "business-type",
  path: null,
  answers: {},
  auditId: null,
  auditToken: null,
  report: null,
  capturedEmail: null,
  capturedFirstName: null,
};

const EMPTY_REQUESTS: RequestState = {
  hydration: null,
  save: null,
  upload: null,
  preflight: null,
  report: null,
  recovery: null,
};

const EMPTY_DOCUMENTS: AuditControllerState["documents"] = {
  items: [],
  error: "",
  uploadActive: false,
  preflightActive: false,
};

export const INITIAL_AUDIT_CONTROLLER_STATE: AuditControllerState = {
  session: INITIAL_AUDIT_SESSION,
  quickBooks: { phase: "idle" },
  callbackNotice: "",
  leadCapture: "required",
  hydration: "boot",
  epoch: 0,
  durableRevision: 0,
  quickBooksRevision: 0,
  sourceRevision: 0,
  requests: EMPTY_REQUESTS,
  report: {
    phase: "idle",
    progress: "saving",
    thinking: "",
    error: "",
    recovery: "retry",
  },
  documents: EMPTY_DOCUMENTS,
  validationMessage: "",
  recovery: { session: null, error: "" },
};

export type AuditEvent =
  | {
      type: "LOCAL_RESTORED";
      session: AuditSessionState;
      quickBooks: QuickBooksState;
      callbackNotice?: string;
      recovery: RecoverySession | null;
    }
  | { type: "LOCAL_RESTORE_EMPTY"; recovery: RecoverySession | null }
  | { type: "HYDRATION_REQUESTED"; requestId: string }
  | {
      type: "REMOTE_RECONCILED";
      requestId: string;
      epoch: number;
      durableRevision: number;
      quickBooksRevision: number;
      auditId: string;
      session: AuditSessionState;
      quickBooks: QuickBooksState;
    }
  | { type: "ANSWER_CHANGED"; answers: AuditAnswers; clearSource?: boolean }
  | { type: "SESSION_REPLACED"; session: AuditSessionState; sourceChanged?: boolean }
  | { type: "STEP_CHANGED"; stepId: string }
  | { type: "VALIDATION_CHANGED"; message: string }
  | { type: "LEAD_CAPTURE_STARTED" }
  | { type: "LEAD_CAPTURE_FAILED" }
  | { type: "LEAD_CAPTURE_COMPLETED"; session: AuditSessionState }
  | { type: "SAVE_REQUESTED"; requestId: string }
  | {
      type: "SAVE_SUCCEEDED";
      requestId: string;
      epoch: number;
      auditId: string;
      auditToken: string;
      capturedEmail: string | null;
      capturedFirstName: string | null;
    }
  | { type: "QBO_STARTING"; localAttemptKey: string; session: AuditSessionState }
  | { type: "QBO_AUTHORIZING"; localAttemptKey: string }
  | {
      type: "QBO_PENDING";
      epoch: number;
      sourceRevision: number;
      localAttemptKey: string;
      advanceToQuestions: boolean;
    }
  | {
      type: "QBO_CONNECTED";
      epoch: number;
      localAttemptKey: string;
      companyName: string | null;
    }
  | {
      type: "QBO_FAILED";
      epoch: number;
      localAttemptKey: string;
      error: string;
      failureStage: "authorization" | "import";
      resetChoice?: boolean;
    }
  | { type: "DOCUMENTS_REFRESHED"; items: AuditDocument[]; epoch: number; sourceRevision: number }
  | { type: "DOCUMENT_ERROR"; error: string; epoch?: number; sourceRevision?: number }
  | { type: "UPLOAD_STARTED"; requestId: string }
  | { type: "UPLOAD_DOCUMENT_READY"; requestId: string; epoch: number; sourceRevision: number; document: AuditDocument }
  | { type: "UPLOAD_FINISHED"; requestId: string; epoch: number; sourceRevision: number }
  | { type: "PREFLIGHT_STARTED"; requestId: string }
  | { type: "PREFLIGHT_FINISHED"; requestId: string; epoch: number; sourceRevision: number }
  | { type: "REPORT_STARTED"; requestId: string; progress: ReportProgress }
  | { type: "REPORT_PROGRESS"; requestId: string; progress?: ReportProgress; thinking?: string }
  | { type: "REPORT_QBO_RECOVERY"; requestId: string }
  | { type: "REPORT_SUCCEEDED"; requestId: string; epoch: number; auditId: string; report: AuditReport }
  | { type: "REPORT_FAILED"; requestId: string; epoch: number; error: string }
  | { type: "RECOVERY_REQUESTED"; requestId: string }
  | { type: "RECOVERY_REQUIRED"; requestId: string; epoch: number; session: RecoverySession }
  | { type: "RECOVERY_FAILED"; requestId: string; epoch: number; error: string }
  | {
      type: "RECOVERY_INSTALLED";
      requestId: string;
      epoch: number;
      session: AuditSessionState;
      quickBooks: QuickBooksState;
    }
  | { type: "RESTARTED" };

export function auditReducer(
  state: AuditControllerState,
  event: AuditEvent,
): AuditControllerState {
  switch (event.type) {
    case "LOCAL_RESTORED": {
      const reportGenerating = STEPS[event.session.stepId].kind === "report" && !event.session.report;
      return {
        ...state,
        session: event.session,
        quickBooks: event.quickBooks,
        callbackNotice: event.callbackNotice ?? "",
        leadCapture: event.session.capturedEmail ? "complete" : "required",
        hydration: "ready",
        recovery: { session: event.recovery, error: "" },
        report: reportGenerating
          ? {
              ...state.report,
              phase: "generating",
              progress: event.session.path === "documents" ? "reading" : "analyzing",
            }
          : state.report,
      };
    }
    case "LOCAL_RESTORE_EMPTY":
      return {
        ...state,
        hydration: "ready",
        recovery: { session: event.recovery, error: "" },
      };
    case "HYDRATION_REQUESTED":
      return { ...state, requests: { ...state.requests, hydration: event.requestId } };
    case "REMOTE_RECONCILED": {
      if (
        event.epoch !== state.epoch ||
        event.durableRevision !== state.durableRevision ||
        event.requestId !== state.requests.hydration ||
        event.auditId !== state.session.auditId
      ) return state;
      const quickBooksUnchanged = event.quickBooksRevision === state.quickBooksRevision;
      const completedReportInstalled = Boolean(event.session.report && !state.session.report);
      return {
        ...state,
        session: event.session,
        quickBooks: quickBooksUnchanged ? event.quickBooks : state.quickBooks,
        leadCapture: event.session.capturedEmail ? "complete" : state.leadCapture,
        requests: {
          ...state.requests,
          hydration: null,
          report: completedReportInstalled ? null : state.requests.report,
        },
        report: completedReportInstalled
          ? { ...state.report, phase: "idle", thinking: "", error: "" }
          : state.report,
      };
    }
    case "ANSWER_CHANGED":
      return {
        ...state,
        session: {
          ...state.session,
          path: event.clearSource ? null : state.session.path,
          answers: event.answers,
        },
        quickBooks: event.clearSource ? { phase: "idle" } : state.quickBooks,
        callbackNotice: event.clearSource ? "" : state.callbackNotice,
        requests: event.clearSource
          ? { ...state.requests, upload: null, preflight: null }
          : state.requests,
        documents: event.clearSource ? EMPTY_DOCUMENTS : state.documents,
        durableRevision: state.durableRevision + 1,
        quickBooksRevision: event.clearSource
          ? state.quickBooksRevision + 1
          : state.quickBooksRevision,
        sourceRevision: event.clearSource ? state.sourceRevision + 1 : state.sourceRevision,
        validationMessage: "",
      };
    case "SESSION_REPLACED":
      return {
        ...state,
        session: event.session,
        durableRevision: state.durableRevision + 1,
        sourceRevision: event.sourceChanged ? state.sourceRevision + 1 : state.sourceRevision,
        validationMessage: "",
      };
    case "STEP_CHANGED":
      return {
        ...state,
        session: { ...state.session, stepId: event.stepId },
        durableRevision: state.durableRevision + 1,
        validationMessage: "",
      };
    case "VALIDATION_CHANGED":
      return { ...state, validationMessage: event.message };
    case "LEAD_CAPTURE_STARTED":
      return { ...state, leadCapture: "submitting" };
    case "LEAD_CAPTURE_FAILED":
      return { ...state, leadCapture: "required" };
    case "LEAD_CAPTURE_COMPLETED":
      return {
        ...state,
        session: event.session,
        leadCapture: "complete",
        durableRevision: state.durableRevision + 1,
      };
    case "SAVE_REQUESTED":
      return { ...state, requests: { ...state.requests, save: event.requestId } };
    case "SAVE_SUCCEEDED": {
      if (event.epoch !== state.epoch || event.requestId !== state.requests.save) return state;
      const capturedEmail = event.capturedEmail ?? state.session.capturedEmail;
      const capturedFirstName = event.capturedFirstName ?? state.session.capturedFirstName;
      const session =
        state.session.auditId === event.auditId &&
        state.session.auditToken === event.auditToken &&
        state.session.capturedEmail === capturedEmail &&
        state.session.capturedFirstName === capturedFirstName
          ? state.session
          : {
              ...state.session,
              auditId: event.auditId,
              auditToken: event.auditToken,
              capturedEmail,
              capturedFirstName,
            };
      return {
        ...state,
        session,
        requests: { ...state.requests, save: null },
      };
    }
    case "QBO_STARTING":
      return {
        ...state,
        session: event.session,
        quickBooks: { phase: "starting", localAttemptKey: event.localAttemptKey },
        callbackNotice: "",
        requests: { ...state.requests, upload: null, preflight: null },
        documents: EMPTY_DOCUMENTS,
        durableRevision: state.durableRevision + 1,
        quickBooksRevision: state.quickBooksRevision + 1,
        sourceRevision: state.sourceRevision + 1,
        validationMessage: "",
      };
    case "QBO_AUTHORIZING":
      if (state.quickBooks.phase !== "starting" || state.quickBooks.localAttemptKey !== event.localAttemptKey) return state;
      return {
        ...state,
        quickBooks: { phase: "authorizing", localAttemptKey: event.localAttemptKey },
        callbackNotice: "",
        quickBooksRevision: state.quickBooksRevision + 1,
      };
    case "QBO_PENDING": {
      const activeAttemptKey = quickBooksAttemptKey(state.quickBooks);
      if (
        event.epoch !== state.epoch ||
        event.sourceRevision !== state.sourceRevision ||
        state.quickBooks.phase === "connected" ||
        (activeAttemptKey !== null && activeAttemptKey !== event.localAttemptKey)
      ) return state;
      return {
        ...state,
        session: {
          ...state.session,
          path: "connected",
          stepId: event.advanceToQuestions ? "goal" : state.session.stepId,
          answers: { ...state.session.answers, connection_choice: "quickbooks" },
        },
        quickBooks: { phase: "pending", localAttemptKey: event.localAttemptKey },
        callbackNotice: "",
        quickBooksRevision: state.quickBooksRevision + 1,
      };
    }
    case "QBO_CONNECTED":
      if (
        event.epoch !== state.epoch ||
        state.session.path !== "connected" ||
        (state.quickBooks.phase !== "pending" &&
          !(state.quickBooks.phase === "failed" && state.quickBooks.failureStage === "import")) ||
        quickBooksAttemptKey(state.quickBooks) !== event.localAttemptKey
      ) return state;
      return {
        ...state,
        quickBooks: {
          phase: "connected",
          companyName: event.companyName,
          localAttemptKey: event.localAttemptKey,
        },
        callbackNotice: "",
        quickBooksRevision: state.quickBooksRevision + 1,
      };
    case "QBO_FAILED": {
      if (event.epoch !== state.epoch) return state;
      if (
        state.quickBooks.phase === "connected" ||
        quickBooksAttemptKey(state.quickBooks) !== event.localAttemptKey
      ) return state;
      const session = event.resetChoice
        ? { ...state.session, path: null, stepId: "connect", answers: withoutConnectionChoice(state.session.answers) }
        : state.session;
      return {
        ...state,
        session,
        quickBooks: {
          phase: "failed",
          error: event.error,
          failureStage: event.failureStage,
          localAttemptKey: event.localAttemptKey,
        },
        callbackNotice: "",
        durableRevision: event.resetChoice
          ? state.durableRevision + 1
          : state.durableRevision,
        quickBooksRevision: state.quickBooksRevision + 1,
        sourceRevision: event.resetChoice
          ? state.sourceRevision + 1
          : state.sourceRevision,
      };
    }
    case "DOCUMENTS_REFRESHED":
      if (event.epoch !== state.epoch || event.sourceRevision !== state.sourceRevision) return state;
      return { ...state, documents: { ...state.documents, items: event.items, error: "" } };
    case "DOCUMENT_ERROR":
      if (event.epoch !== undefined && event.epoch !== state.epoch) return state;
      if (event.sourceRevision !== undefined && event.sourceRevision !== state.sourceRevision) return state;
      return { ...state, documents: { ...state.documents, error: event.error } };
    case "UPLOAD_STARTED":
      return {
        ...state,
        requests: { ...state.requests, upload: event.requestId },
        documents: { ...state.documents, uploadActive: true, error: "" },
      };
    case "UPLOAD_DOCUMENT_READY":
      if (
        event.epoch !== state.epoch ||
        event.sourceRevision !== state.sourceRevision ||
        event.requestId !== state.requests.upload
      ) return state;
      return {
        ...state,
        documents: {
          ...state.documents,
          items: upsertAuditDocument(state.documents.items, event.document),
        },
        validationMessage: "",
      };
    case "UPLOAD_FINISHED":
      if (
        event.epoch !== state.epoch ||
        event.sourceRevision !== state.sourceRevision ||
        event.requestId !== state.requests.upload
      ) return state;
      return {
        ...state,
        requests: { ...state.requests, upload: null },
        documents: { ...state.documents, uploadActive: false },
      };
    case "PREFLIGHT_STARTED":
      return {
        ...state,
        requests: { ...state.requests, preflight: event.requestId },
        documents: { ...state.documents, preflightActive: true, error: "" },
      };
    case "PREFLIGHT_FINISHED":
      if (
        event.epoch !== state.epoch ||
        event.sourceRevision !== state.sourceRevision ||
        event.requestId !== state.requests.preflight
      ) return state;
      return {
        ...state,
        requests: { ...state.requests, preflight: null },
        documents: { ...state.documents, preflightActive: false },
      };
    case "REPORT_STARTED":
      return {
        ...state,
        requests: {
          ...state.requests,
          report: {
            requestId: event.requestId,
            durableRevision: state.durableRevision,
            sourceRevision: state.sourceRevision,
          },
        },
        report: {
          phase: "generating",
          progress: event.progress,
          thinking: "",
          error: "",
          recovery: "retry",
        },
      };
    case "REPORT_PROGRESS":
      if (!reportRequestMatches(state, event.requestId)) return state;
      return {
        ...state,
        report: {
          ...state.report,
          progress: event.progress ?? state.report.progress,
          thinking: event.thinking ?? state.report.thinking,
        },
      };
    case "REPORT_QBO_RECOVERY":
      if (!reportRequestMatches(state, event.requestId)) return state;
      return { ...state, report: { ...state.report, recovery: "quickbooks" } };
    case "REPORT_SUCCEEDED":
      if (
        event.epoch !== state.epoch ||
        !reportRequestMatches(state, event.requestId) ||
        event.auditId !== state.session.auditId ||
        state.session.report !== null
      ) return state;
      return {
        ...state,
        session: { ...state.session, report: event.report },
        requests: { ...state.requests, report: null },
        report: { ...state.report, phase: "idle", thinking: "", error: "" },
      };
    case "REPORT_FAILED":
      if (event.epoch !== state.epoch || !reportRequestMatches(state, event.requestId)) return state;
      return {
        ...state,
        requests: { ...state.requests, report: null },
        report: { ...state.report, phase: "error", error: event.error },
      };
    case "RECOVERY_REQUESTED":
      return {
        ...state,
        requests: { ...state.requests, recovery: event.requestId },
        recovery: { ...state.recovery, error: "" },
      };
    case "RECOVERY_REQUIRED":
      if (event.epoch !== state.epoch || event.requestId !== state.requests.recovery) return state;
      return {
        ...state,
        requests: { ...state.requests, recovery: null },
        recovery: { session: event.session, error: "" },
      };
    case "RECOVERY_FAILED":
      if (event.epoch !== state.epoch || event.requestId !== state.requests.recovery) return state;
      return {
        ...state,
        requests: { ...state.requests, recovery: null },
        recovery: { ...state.recovery, error: event.error },
      };
    case "RECOVERY_INSTALLED":
      if (event.epoch !== state.epoch || event.requestId !== state.requests.recovery) return state;
      return {
        ...INITIAL_AUDIT_CONTROLLER_STATE,
        session: event.session,
        quickBooks: event.quickBooks,
        leadCapture: "complete",
        hydration: "ready",
        epoch: state.epoch + 1,
        report: STEPS[event.session.stepId].kind === "report" && !event.session.report
          ? {
              ...INITIAL_AUDIT_CONTROLLER_STATE.report,
              phase: "generating",
              progress: event.session.path === "documents" ? "reading" : "analyzing",
            }
          : INITIAL_AUDIT_CONTROLLER_STATE.report,
      };
    case "RESTARTED":
      return {
        ...INITIAL_AUDIT_CONTROLLER_STATE,
        hydration: "ready",
        epoch: state.epoch + 1,
      };
  }
}

function reportRequestMatches(state: AuditControllerState, requestId: string): boolean {
  const active = state.requests.report;
  return Boolean(
    active &&
    active.requestId === requestId &&
    active.durableRevision === state.durableRevision &&
    active.sourceRevision === state.sourceRevision
  );
}

export function selectAuditScreen(state: AuditControllerState): AuditScreen {
  if (state.hydration === "boot") return "boot";
  if (state.recovery.session) return "recovery";
  if (state.session.report) return "report";
  if (
    state.session.capturedEmail &&
    state.session.path === "connected" &&
    state.quickBooks.phase === "failed" &&
    state.quickBooks.failureStage === "import"
  ) return "quickbooks-error";
  if (state.leadCapture !== "complete") return "lead";
  if (STEPS[state.session.stepId].kind === "report") return "report-pending";
  return "questionnaire";
}

export type StoredAuditV2 = {
  stepId: string;
  path: AuditPath | null;
  answers: AuditAnswers;
  auditId: string | null;
  auditToken: string | null;
  companyName: string | null;
  report: AuditReport | null;
  capturedEmail: string | null;
  capturedFirstName: string | null;
  connectionStatus: QuickBooksConnectionStatus;
  quickBooksPhase?: "authorizing" | "authorization_failed";
  quickBooksError?: string;
  callbackNotice?: string;
};

export type DecodedAuditStorage = {
  session: AuditSessionState;
  quickBooks: QuickBooksState;
  callbackNotice: string;
};

export function encodeAuditStorage(
  session: AuditSessionState,
  quickBooks: QuickBooksState,
  callbackNotice = "",
): string {
  return JSON.stringify(projectAuditStorage(session, quickBooks, callbackNotice));
}

export function projectAuditStorage(
  session: AuditSessionState,
  quickBooks: QuickBooksState,
  callbackNotice = "",
): StoredAuditV2 {
  const connectedIntent =
    quickBooks.phase === "starting" ||
    quickBooks.phase === "authorizing" ||
    quickBooks.phase === "pending" ||
    quickBooks.phase === "connected" ||
    (quickBooks.phase === "failed" && session.path === "connected");
  const projectedSession = connectedIntent
    ? {
        ...session,
        path: "connected" as const,
        stepId: quickBooks.phase === "authorizing" ? "connect" : session.stepId,
        answers: { ...session.answers, connection_choice: "quickbooks" },
      }
    : session;
  return {
    ...projectedSession,
    companyName: quickBooks.phase === "connected" ? quickBooks.companyName : null,
    connectionStatus: quickBooksStatus(quickBooks),
    ...(quickBooks.phase === "authorizing" ? { quickBooksPhase: "authorizing" as const } : {}),
    ...(quickBooks.phase === "failed" && quickBooks.failureStage === "authorization"
      ? {
          quickBooksPhase: "authorization_failed" as const,
          quickBooksError: quickBooks.error,
        }
      : {}),
    ...(callbackNotice ? { callbackNotice } : {}),
  };
}

export function decodeAuditStorage(raw: string): DecodedAuditStorage | null {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return null;
  const migrated = { ...parsed } as Record<string, unknown>;
  if (migrated.stepId === "quickbooks-access") {
    migrated.stepId = "connect";
    migrated.path = null;
  }
  if (migrated.path === "connected" && migrated.stepId === "revenue-pattern") {
    migrated.stepId = "bookkeeping";
  }
  if (!isStoredAudit(migrated)) return null;
  const stored: StoredAuditV2 = {
    ...migrated,
    auditId: migrated.auditId ?? null,
    auditToken: migrated.auditToken ?? null,
    companyName: migrated.companyName ?? null,
    report: migrated.report ?? null,
    capturedEmail: migrated.capturedEmail ?? null,
    capturedFirstName: migrated.capturedFirstName ?? null,
    connectionStatus: migrated.connectionStatus ?? "not_started",
  };
  const normalizedSession = normalizeStoredSession({
    stepId: stored.stepId,
    path: stored.path,
    answers: stored.answers,
    auditId: stored.auditId,
    auditToken: stored.auditToken,
    report: stored.report,
    capturedEmail: stored.capturedEmail,
    capturedFirstName: stored.capturedFirstName,
  });
  const quickBooks = quickBooksFromTransport(
    stored.connectionStatus,
    stored.companyName,
    `restored:${stored.auditId ?? "anonymous"}`,
    stored.quickBooksPhase,
    stored.quickBooksError,
  );
  return {
    session: repairQuickBooksProgress(normalizedSession, quickBooks),
    quickBooks,
    callbackNotice: stored.callbackNotice ?? "",
  };
}

export function normalizeStoredSession(value: AuditSessionState): AuditSessionState {
  const answers = normalizeStoredAnswers(value.answers);
  const { path, stepId } = normalizeStoredAuditLocation({
    answers,
    path: value.path,
    stepId: value.stepId,
    hasReport: Boolean(value.report),
  });
  return { ...value, answers, path, stepId };
}

function repairQuickBooksProgress(
  session: AuditSessionState,
  quickBooks: QuickBooksState,
): AuditSessionState {
  if (
    session.path === "connected" &&
    session.stepId === "connect" &&
    (quickBooks.phase === "pending" || quickBooks.phase === "connected")
  ) {
    return { ...session, stepId: "goal" };
  }
  return session;
}

export function reconcileRemoteAudit(
  localSession: AuditSessionState,
  localQuickBooks: QuickBooksState,
  remote: AuditRemoteSession,
): DecodedAuditStorage {
  const remoteStepId = remote.stepId && remote.stepId in STEPS ? remote.stepId : localSession.stepId;
  const sourceWasReset =
    localQuickBooks.phase === "failed" &&
    localQuickBooks.failureStage === "authorization" &&
    localSession.path === null &&
    localSession.answers.connection_choice === undefined &&
    (remote.connectionStatus === undefined ||
      remote.connectionStatus === "not_started" ||
      remote.connectionStatus === "pending");
  const path = sourceWasReset
    ? null
    : remote.path === undefined
      ? localSession.path
      : remote.path;
  // Reason: A debounced remote save can lag the browser. Remote facts fill
  // gaps, but cannot overwrite a valid answer already present in this tab.
  let answers = remote.answers && typeof remote.answers === "object"
    ? { ...remote.answers, ...localSession.answers }
    : localSession.answers;
  if (sourceWasReset) answers = withoutConnectionChoice(answers);
  const snapshot = {
    ...localSession,
    path,
    answers,
    report: remote.report ?? localSession.report,
    capturedEmail: remote.capturedEmail ?? localSession.capturedEmail,
    capturedFirstName: remote.capturedFirstName ?? localSession.capturedFirstName,
  };
  const localProgress = normalizeStoredSession({ ...snapshot, stepId: localSession.stepId });
  const remoteProgress = normalizeStoredSession({ ...snapshot, stepId: remoteStepId });
  const flow = remoteProgress.path ? FLOWS[remoteProgress.path] : SHARED_FLOW;
  const reconciledSession = flow.indexOf(localProgress.stepId) > flow.indexOf(remoteProgress.stepId)
    ? { ...remoteProgress, stepId: localProgress.stepId }
    : remoteProgress;
  const quickBooks = reconcileQuickBooks(
    localQuickBooks,
    remote.connectionStatus,
    remote.qboCompanyName ?? null,
    `remote:${remote.id}`,
  );
  return {
    session: repairQuickBooksProgress(reconciledSession, quickBooks),
    quickBooks,
    callbackNotice: "",
  };
}

export function recoveredAuditState(
  recovered: RecoveredFinancialHealthAudit,
): DecodedAuditStorage {
  if (recovered.session) {
    const session = normalizeStoredSession({
      ...INITIAL_AUDIT_SESSION,
      ...recovered.session,
      auditId: recovered.id,
      auditToken: recovered.session.accessToken,
      capturedEmail: recovered.capturedEmail,
      capturedFirstName: recovered.capturedFirstName,
    });
    return {
      session,
      quickBooks: quickBooksFromTransport(
        recovered.session.connectionStatus ?? "not_started",
        recovered.session.qboCompanyName ?? null,
        `recovered:${recovered.id}`,
      ),
      callbackNotice: "",
    };
  }
  const path = recovered.path ?? "unconnected";
  const reportStepId = FLOWS[path].find((stepId) => STEPS[stepId].kind === "report");
  if (!reportStepId) throw new Error("This report could not be displayed.");
  return {
    session: {
      ...INITIAL_AUDIT_SESSION,
      stepId: reportStepId,
      path,
      auditId: recovered.id,
      report: recovered.report,
      capturedEmail: recovered.capturedEmail,
      capturedFirstName: recovered.capturedFirstName,
    },
    quickBooks: path === "connected"
      ? { phase: "connected", companyName: null, localAttemptKey: `recovered:${recovered.id}` }
      : { phase: "idle" },
    callbackNotice: "",
  };
}

export function quickBooksFromTransport(
  status: QuickBooksConnectionStatus,
  companyName: string | null,
  localAttemptKey: string,
  storedPhase?: "authorizing" | "authorization_failed",
  storedError?: string,
): QuickBooksState {
  if (storedPhase === "authorizing" && (status === "not_started" || status === "pending")) {
    return { phase: "authorizing", localAttemptKey };
  }
  if (storedPhase === "authorization_failed" && (status === "not_started" || status === "pending")) {
    return {
      phase: "failed",
      error: storedError?.trim() || "QuickBooks was not connected. Try again or continue without it.",
      failureStage: "authorization",
      localAttemptKey,
    };
  }
  if (status === "pending") return { phase: "pending", localAttemptKey };
  if (status === "connected") return { phase: "connected", companyName, localAttemptKey };
  if (status === "failed") {
    return {
      phase: "failed",
      error: "QuickBooks could not be imported. Reconnect QuickBooks and try again.",
      failureStage: "import",
      localAttemptKey,
    };
  }
  return { phase: "idle" };
}

function reconcileQuickBooks(
  local: QuickBooksState,
  remoteStatus: QuickBooksConnectionStatus | undefined,
  companyName: string | null,
  fallbackAttemptKey: string,
): QuickBooksState {
  if (!remoteStatus) return local;
  if (remoteStatus === "connected") {
    return {
      phase: "connected",
      companyName,
      localAttemptKey: quickBooksAttemptKey(local) ?? fallbackAttemptKey,
    };
  }
  if (remoteStatus === "failed") {
    const localAttemptKey = "localAttemptKey" in local ? local.localAttemptKey : fallbackAttemptKey;
    return {
      phase: "failed",
      error: "QuickBooks could not be imported. Reconnect QuickBooks and try again.",
      failureStage: "import",
      localAttemptKey,
    };
  }
  // Reason: Callback-confirmed work and terminal success are monotonic. A
  // lagging ordinary snapshot cannot rewind either one.
  if (
    (local.phase === "authorizing" ||
      local.phase === "pending" ||
      local.phase === "connected" ||
      local.phase === "failed") &&
    remoteStatus === "not_started"
  ) return local;
  if (local.phase === "connected" && remoteStatus === "pending") return local;
  // Starting OAuth marks the backend pending before Intuit returns. Pending is
  // therefore not proof that this browser received the matching callback.
  if (
    (local.phase === "authorizing" ||
      (local.phase === "failed" && local.failureStage === "authorization")) &&
    remoteStatus === "pending"
  ) return local;
  if (remoteStatus === "pending") {
    return {
      phase: "pending",
      localAttemptKey: "localAttemptKey" in local ? local.localAttemptKey ?? fallbackAttemptKey : fallbackAttemptKey,
    };
  }
  return local.phase === "starting" ? local : { phase: "idle" };
}

function quickBooksAttemptKey(state: QuickBooksState): string | null {
  return "localAttemptKey" in state ? state.localAttemptKey : null;
}

function withoutConnectionChoice(answers: AuditAnswers): AuditAnswers {
  const nextAnswers = { ...answers };
  delete nextAnswers.connection_choice;
  return nextAnswers;
}

export function normalizeStoredAuditLocation(value: {
  answers: AuditAnswers;
  path: AuditPath | null;
  stepId: string;
  hasReport: boolean;
}): Pick<AuditSessionState, "path" | "stepId"> {
  const selectedConnection = value.answers.connection_choice;
  const answeredPath = selectedConnection === "quickbooks"
    ? "connected"
    : selectedConnection === "documents"
      ? "documents"
      : selectedConnection === "questions"
        ? "unconnected"
        : null;
  const path = answeredPath ?? (value.hasReport ? value.path : null);
  const flow = path ? FLOWS[path] : SHARED_FLOW;
  let stepId = flow.includes(value.stepId) ? value.stepId : flow[0];
  if (!value.hasReport) {
    const currentIndex = Math.max(0, flow.indexOf(stepId));
    const firstIncomplete = flow
      .slice(0, currentIndex + 1)
      .find((candidate) => !canContinue(STEPS[candidate], value.answers));
    if (firstIncomplete) stepId = firstIncomplete;
  }
  return { path, stepId };
}

export function leadCaptureDestination(
  recoveryAvailable: boolean | undefined,
): "recovery" | "intake" {
  return recoveryAvailable ? "recovery" : "intake";
}

export function quickBooksStatus(state: QuickBooksState): QuickBooksConnectionStatus {
  if (state.phase === "pending") return "pending";
  if (state.phase === "connected") return "connected";
  if (state.phase === "failed" && state.failureStage === "import") return "failed";
  return "not_started";
}

function upsertAuditDocument(
  documents: AuditDocument[],
  nextDocument: AuditDocument,
): AuditDocument[] {
  const index = documents.findIndex((document) => document.id === nextDocument.id);
  if (index === -1) return [...documents, nextDocument];
  const nextDocuments = [...documents];
  nextDocuments[index] = nextDocument;
  return nextDocuments;
}

const LEGACY_ANSWER_VALUE_MAP: Record<string, Record<string, string>> = {
  business_type: { Other: "Something else" },
  connection_choice: { skip: "questions" },
  audit_goals: {
    "See where my money is going": "Understand my cash flow needs",
    "Understand why costs are rising": "Find cost-saving opportunities",
    "Know how much cash to keep": "Understand my cash flow needs",
    "See what I can afford to invest": "Know if I can afford my next big move (expansion, vehicle purchase, new hire, etc)",
    "Get customers to pay faster": "Get paid faster by customers who owe me",
    "Feel more confident in my numbers": "See what’s wrong or missing in my books",
  },
  biggest_cash_plan: {
    Inventory: "Inventory or materials",
    "Paying taxes or debt": "Paying down debt or taxes",
    "Nothing major planned": "Nothing big planned",
    "I’m not sure yet": "Not sure yet",
  },
  books_confidence: {
    "Very confident — last month is complete": "Very confident: last month is complete",
    "Mostly confident — a few things may be off": "Mostly confident: a few things may be off",
    "Not very confident — we need some cleanup": "Not very confident: we need some cleanup",
  },
  invoices_guess: { "Nothing — customers pay upfront": "Nothing: customers pay upfront" },
};

const FREE_TEXT_ANSWER_FIELDS = new Set([
  "business_type_other",
  "audit_goals_other",
  "cash_plan_details",
  "business_description",
]);

function normalizeStoredAnswers(value: AuditAnswers): AuditAnswers {
  const fields = Object.values(STEPS).flatMap((step) => step.fields ?? []);
  const fieldByName = new Map(fields.map((field) => [field.name, field]));
  const normalized: AuditAnswers = {};
  for (const [name, rawValue] of Object.entries(value)) {
    const field = fieldByName.get(name);
    if (!field && !FREE_TEXT_ANSWER_FIELDS.has(name)) continue;
    if (!field?.options?.length) {
      if (typeof rawValue === "string") normalized[name] = rawValue;
      continue;
    }
    const allowed = new Set(field.options.map((option) => option.label));
    const mapValue = (item: string) => LEGACY_ANSWER_VALUE_MAP[name]?.[item] ?? item;
    if (Array.isArray(rawValue)) {
      const items = [...new Set(rawValue.map(mapValue).filter((item) => allowed.has(item)))];
      if (items.length) normalized[name] = items;
      continue;
    }
    const item = mapValue(rawValue);
    if (allowed.has(item)) normalized[name] = item;
  }
  return normalized;
}

function isStoredAudit(value: Record<string, unknown>): value is StoredAuditV2 {
  return (
    typeof value.stepId === "string" &&
    value.stepId in STEPS &&
    (value.path === null || value.path === "connected" || value.path === "documents" || value.path === "unconnected") &&
    isRecord(value.answers) &&
    (value.auditId === undefined || value.auditId === null || typeof value.auditId === "string") &&
    (value.auditToken === undefined || value.auditToken === null || typeof value.auditToken === "string") &&
    (value.companyName === undefined || value.companyName === null || typeof value.companyName === "string") &&
    (value.report === undefined || value.report === null || isAuditReport(value.report)) &&
    (value.capturedEmail === undefined || value.capturedEmail === null || typeof value.capturedEmail === "string") &&
    (value.capturedFirstName === undefined || value.capturedFirstName === null || typeof value.capturedFirstName === "string") &&
    (value.connectionStatus === undefined ||
      value.connectionStatus === "not_started" ||
      value.connectionStatus === "pending" ||
      value.connectionStatus === "connected" ||
      value.connectionStatus === "failed") &&
    (value.quickBooksPhase === undefined ||
      value.quickBooksPhase === "authorizing" ||
      value.quickBooksPhase === "authorization_failed") &&
    (value.quickBooksError === undefined || typeof value.quickBooksError === "string") &&
    (value.callbackNotice === undefined || typeof value.callbackNotice === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export function isNarratedFinding(value: unknown): value is NarratedFinding {
  if (!isRecord(value)) return false;
  const verdict = value.verdict;
  return (
    typeof value.checkId === "string" &&
    typeof value.stat === "string" &&
    (verdict === "looks_good" || verdict === "needs_attention" || verdict === "fact") &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.fixNote === "string" &&
    (value.tiedTo === undefined || value.tiedTo === null || typeof value.tiedTo === "string") &&
    typeof value.locked === "boolean"
  );
}

export function isAuditActionPlan(value: unknown): value is NonNullable<AuditReport["actionPlan"]> {
  if (!isRecord(value)) return false;
  const validActions = (actions: unknown) => (
    Array.isArray(actions) &&
    actions.every((action) => isRecord(action) && typeof action.title === "string" && typeof action.body === "string")
  );
  return validActions(value.thisWeek) && validActions(value.thisQuarter);
}

function isAuditReport(value: unknown): value is AuditReport {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<AuditReport>;
  const findings = candidate.findings;
  const additionalFindings = candidate.additionalFindings;
  if (
    typeof candidate.title !== "string" ||
    typeof candidate.lede !== "string" ||
    (candidate.analysisSummary !== undefined && typeof candidate.analysisSummary !== "string") ||
    !Array.isArray(findings) ||
    !Array.isArray(candidate.actions) ||
    typeof candidate.confidenceTitle !== "string" ||
    typeof candidate.confidenceBody !== "string" ||
    candidate.version !== 2
  ) return false;
  return (
    typeof candidate.headline === "string" &&
    typeof candidate.reviewPeriod === "string" &&
    typeof candidate.summary === "string" &&
    findings.every(isNarratedFinding) &&
    (additionalFindings === undefined ||
      (Array.isArray(additionalFindings) && additionalFindings.every(isNarratedFinding))) &&
    ((findings.length === 3 && additionalFindings?.length === 3) ||
      (findings.length === 6 && additionalFindings === undefined)) &&
    isAuditActionPlan(candidate.actionPlan) &&
    typeof candidate.reliabilityNote === "string"
  );
}
