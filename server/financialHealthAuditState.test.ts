import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_AUDIT_CONTROLLER_STATE,
  auditReducer,
  decodeAuditStorage,
  leadCaptureDestination,
  normalizeStoredAuditLocation,
  projectAuditStorage,
  reconcileRemoteAudit,
  recoveredAuditState,
  selectAuditScreen,
  type AuditControllerState,
  type AuditSessionState,
} from "../src/pages/financialHealthAuditState.ts";

const capturedSession: AuditSessionState = {
  ...INITIAL_AUDIT_CONTROLLER_STATE.session,
  capturedEmail: "owner@example.com",
  auditId: "audit-id",
  auditToken: "audit-token",
};

function readyState(overrides: Partial<AuditControllerState> = {}): AuditControllerState {
  return {
    ...INITIAL_AUDIT_CONTROLLER_STATE,
    session: capturedSession,
    leadCapture: "complete",
    hydration: "ready",
    ...overrides,
  };
}

test("lead capture recovers saved work or continues to intake", () => {
  // Reason: New contacts should enter the questionnaire without starting AI.
  assert.equal(leadCaptureDestination(true), "recovery");
  assert.equal(leadCaptureDestination(false), "intake");
  assert.equal(leadCaptureDestination(undefined), "intake");
});

test("recovered report keeps its report flow after refresh with empty answers", () => {
  const restored = normalizeStoredAuditLocation({
    answers: {},
    path: "documents",
    stepId: "complete-d",
    hasReport: true,
  });

  assert.deepEqual(restored, { path: "documents", stepId: "complete-d" });
});

test("unfinished sessions still derive their flow from questionnaire answers", () => {
  const restored = normalizeStoredAuditLocation({
    answers: {},
    path: "documents",
    stepId: "complete-d",
    hasReport: false,
  });

  assert.deepEqual(restored, { path: null, stepId: "business-type" });
});

test("storage repair advances an active QuickBooks import past the chooser", () => {
  for (const connectionStatus of ["pending", "connected"] as const) {
    const restored = decodeAuditStorage(JSON.stringify({
      ...capturedSession,
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      connectionStatus,
      companyName: connectionStatus === "connected" ? "Audit Company" : null,
    }));

    assert.equal(restored?.session.stepId, "goal");
    assert.equal(restored?.quickBooks.phase, connectionStatus);
  }
});

test("verified recovery applies the connected QuickBooks progress repair", () => {
  // Reason: Email recovery installs its decoded session directly and does not
  // dispatch the storage readback, so this boundary must not restore the
  // backend's durable `connect` fence as a user-visible choice screen.
  const restored = recoveredAuditState({
    id: "audit-id",
    path: "connected",
    report: null,
    capturedEmail: "owner@example.com",
    capturedFirstName: null,
    session: {
      id: "audit-id",
      status: "in_progress",
      report: null,
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      accessToken: "rotated-secret",
      connectionStatus: "connected",
      qboCompanyName: "Audit Company",
    },
  });

  assert.equal(restored.session.stepId, "goal");
  assert.equal(restored.quickBooks.phase, "connected");
});

test("authorizing QuickBooks intent and callback notice round-trip without pretending import started", () => {
  const session = {
    ...capturedSession,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
  };
  const projected = projectAuditStorage(session, {
    phase: "authorizing",
    localAttemptKey: "attempt",
  }, "QuickBooks returned for a different audit.");
  const restored = decodeAuditStorage(JSON.stringify(projected));

  assert.equal(projected.connectionStatus, "not_started");
  assert.equal(projected.quickBooksPhase, "authorizing");
  assert.equal(restored?.session.stepId, "connect");
  assert.equal(restored?.quickBooks.phase, "authorizing");
  assert.equal(restored?.callbackNotice, "QuickBooks returned for a different audit.");
});

test("authorization failure round-trips as a source-reset tombstone", () => {
  const session = {
    ...capturedSession,
    stepId: "connect",
    path: null,
    answers: { business_type: "Professional services" },
  };
  const projected = projectAuditStorage(session, {
    phase: "failed",
    error: "QuickBooks was not connected. Try again or continue without it.",
    failureStage: "authorization",
    localAttemptKey: "attempt",
  });
  const restored = decodeAuditStorage(JSON.stringify(projected));

  assert.equal(projected.connectionStatus, "not_started");
  assert.equal(projected.quickBooksPhase, "authorization_failed");
  assert.equal(projected.answers.connection_choice, undefined);
  assert.equal(restored?.session.path, null);
  assert.equal(restored?.quickBooks.phase, "failed");
  if (restored?.quickBooks.phase === "failed") {
    assert.equal(restored.quickBooks.failureStage, "authorization");
  }
});

test("legacy QuickBooks access snapshots return to the connection chooser", () => {
  const restored = decodeAuditStorage(JSON.stringify({
    ...capturedSession,
    stepId: "quickbooks-access",
    path: "connected",
    answers: { business_type: "Professional services" },
  }));

  assert.equal(restored?.session.path, null);
  assert.equal(restored?.session.stepId, "connect");
  assert.equal(restored?.quickBooks.phase, "idle");
});

test("screen selection has one deterministic precedence order", () => {
  const report = { ...readyState().report, phase: "error" as const };
  const qboFailure = {
    phase: "failed" as const,
    error: "Import stopped",
    failureStage: "import" as const,
    localAttemptKey: "attempt",
  };
  const connectedSession = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "goal",
    answers: { connection_choice: "quickbooks" },
  };
  const recovery = { state: "recovery-state", email: "owner@example.com" };

  assert.equal(selectAuditScreen(readyState({
    session: connectedSession,
    quickBooks: qboFailure,
    report,
    recovery: { session: recovery, error: "" },
  })), "recovery");
  assert.equal(selectAuditScreen(readyState({
    session: connectedSession,
    quickBooks: qboFailure,
  })), "quickbooks-error");
});

test("remote reconciliation cannot rewind local answers, progress, or QBO intent", () => {
  const local = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "bookkeeping",
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
      audit_goals: ["Understand my cash flow needs"],
    },
  };
  const reconciled = reconcileRemoteAudit(
    local,
    { phase: "pending", localAttemptKey: "attempt" },
    {
      id: "audit-id",
      status: "in_progress",
      report: null,
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      connectionStatus: "not_started",
    },
  );

  assert.equal(reconciled.session.stepId, "bookkeeping");
  assert.deepEqual(reconciled.session.answers.audit_goals, ["Understand my cash flow needs"]);
  assert.equal(reconciled.quickBooks.phase, "pending");
});

test("a stale not-started snapshot cannot erase a restored QBO failure", () => {
  const session = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "goal",
    answers: { connection_choice: "quickbooks" },
  };
  const reconciled = reconcileRemoteAudit(
    session,
    {
      phase: "failed",
      error: "These books already belong to a Porter workspace.",
      failureStage: "import",
      localAttemptKey: "attempt",
    },
    {
      id: "audit-id",
      status: "in_progress",
      report: null,
      connectionStatus: "not_started",
    },
  );

  assert.equal(reconciled.quickBooks.phase, "failed");
});

test("remote pending cannot complete the browser's OAuth authorization step", () => {
  const session = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "connect",
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
  };
  const reconciled = reconcileRemoteAudit(
    session,
    { phase: "authorizing", localAttemptKey: "attempt" },
    {
      id: "audit-id",
      status: "in_progress",
      report: null,
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      connectionStatus: "pending",
    },
  );

  assert.equal(reconciled.session.stepId, "connect");
  assert.equal(reconciled.quickBooks.phase, "authorizing");
});

test("a stale remote source cannot undo an authorization-error reset", () => {
  const reconciled = reconcileRemoteAudit(
    {
      ...capturedSession,
      path: null,
      stepId: "connect",
      answers: { business_type: "Professional services" },
    },
    {
      phase: "failed",
      error: "QuickBooks was not connected.",
      failureStage: "authorization",
      localAttemptKey: "attempt",
    },
    {
      id: "audit-id",
      status: "in_progress",
      report: null,
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      connectionStatus: "pending",
    },
  );

  assert.equal(reconciled.session.path, null);
  assert.equal(reconciled.session.answers.connection_choice, undefined);
  assert.equal(reconciled.quickBooks.phase, "failed");
});

test("lead capture remains gated until the capture operation completes", () => {
  let state = auditReducer(readyState({
    session: INITIAL_AUDIT_CONTROLLER_STATE.session,
    leadCapture: "required",
  }), { type: "LEAD_CAPTURE_STARTED" });
  state = auditReducer(state, { type: "SAVE_REQUESTED", requestId: "save" });
  state = auditReducer(state, {
    type: "SAVE_SUCCEEDED",
    requestId: "save",
    epoch: 0,
    auditId: "audit-id",
    auditToken: "audit-token",
    capturedEmail: "owner@example.com",
    capturedFirstName: null,
  });

  assert.equal(state.session.capturedEmail, "owner@example.com");
  assert.equal(selectAuditScreen(state), "lead");

  state = auditReducer(state, { type: "LEAD_CAPTURE_COMPLETED", session: state.session });
  assert.equal(selectAuditScreen(state), "questionnaire");
});

test("a no-op save preserves session identity so autosave cannot self-trigger", () => {
  let state = readyState();
  const session = state.session;
  state = auditReducer(state, { type: "SAVE_REQUESTED", requestId: "save" });
  state = auditReducer(state, {
    type: "SAVE_SUCCEEDED",
    requestId: "save",
    epoch: 0,
    auditId: session.auditId!,
    auditToken: session.auditToken!,
    capturedEmail: session.capturedEmail,
    capturedFirstName: session.capturedFirstName,
  });

  assert.equal(state.session, session);
});

test("operation fences reject stale hydration and QuickBooks completions", () => {
  const connectedSession = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "bookkeeping",
    answers: { connection_choice: "quickbooks" },
  };
  let state = readyState({
    session: connectedSession,
    quickBooks: { phase: "pending", localAttemptKey: "attempt" },
    durableRevision: 2,
    requests: {
      ...INITIAL_AUDIT_CONTROLLER_STATE.requests,
      hydration: "latest",
    },
  });
  const beforeHydration = state;
  state = auditReducer(state, {
    type: "REMOTE_RECONCILED",
    requestId: "stale",
    epoch: 0,
    durableRevision: 1,
    quickBooksRevision: 0,
    auditId: "audit-id",
    session: { ...connectedSession, stepId: "connect" },
    quickBooks: { phase: "idle" },
  });
  assert.equal(state, beforeHydration);

  state = auditReducer(state, { type: "RESTARTED" });
  const restarted = state;
  state = auditReducer(state, {
    type: "QBO_CONNECTED",
    epoch: 0,
    localAttemptKey: "attempt",
    companyName: "Old Company",
  });
  assert.equal(state, restarted);
});

test("slow hydration cannot rewind a newer QuickBooks failure", () => {
  const session = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "goal",
    answers: { connection_choice: "quickbooks" },
  };
  let state = readyState({
    session,
    quickBooks: { phase: "pending", localAttemptKey: "attempt" },
    requests: {
      ...INITIAL_AUDIT_CONTROLLER_STATE.requests,
      hydration: "hydrate",
    },
  });
  state = auditReducer(state, {
    type: "QBO_FAILED",
    epoch: 0,
    localAttemptKey: "attempt",
    error: "These books already belong to a Porter workspace.",
    failureStage: "import",
  });
  state = auditReducer(state, {
    type: "REMOTE_RECONCILED",
    requestId: "hydrate",
    epoch: 0,
    durableRevision: 0,
    quickBooksRevision: 0,
    auditId: "audit-id",
    session,
    quickBooks: { phase: "pending", localAttemptKey: "attempt" },
  });

  assert.equal(state.quickBooks.phase, "failed");
  assert.equal(state.requests.hydration, null);
});

test("a restarted audit cannot install a late verified session", () => {
  let state = readyState({
    recovery: {
      session: { state: "recovery-state", email: "owner@example.com" },
      error: "",
    },
  });
  state = auditReducer(state, { type: "RECOVERY_REQUESTED", requestId: "verify" });
  state = auditReducer(state, { type: "RESTARTED" });
  const restarted = state;
  state = auditReducer(state, {
    type: "RECOVERY_INSTALLED",
    requestId: "verify",
    epoch: 0,
    session: {
      ...capturedSession,
      auditId: "recovered-audit",
      auditToken: "rotated-token",
    },
    quickBooks: { phase: "idle" },
  });

  assert.equal(state, restarted);
});

test("a retryable recovery conflict retains only the email for a fresh attempt", () => {
  // Reason: A concurrent recovery winner invalidates the current challenge and
  // target bearer; neither may survive into the next retry attempt.
  const state = auditReducer(readyState({
    recovery: {
      session: { state: "stale-recovery-state", email: "owner@example.com" },
      error: "",
    },
  }), {
    type: "RECOVERY_CONFLICTED",
    epoch: 0,
    email: "owner@example.com",
  });

  assert.equal(state.session.capturedEmail, "owner@example.com");
  assert.equal(state.session.auditId, null);
  assert.equal(state.session.auditToken, null);
  assert.equal(state.recovery.session, null);
  assert.equal(state.leadCapture, "required");
  assert.equal(selectAuditScreen(state), "lead");
  assert.match(state.validationMessage, /fresh code/i);
});

test("a report result cannot cross an answer or source revision", () => {
  let state = readyState({
    session: {
      ...capturedSession,
      path: "unconnected",
      stepId: "complete-u",
    },
  });
  state = auditReducer(state, {
    type: "REPORT_STARTED",
    requestId: "report",
    progress: "analyzing",
  });
  state = auditReducer(state, { type: "STEP_CHANGED", stepId: "context" });
  const edited = state;
  state = auditReducer(state, {
    type: "REPORT_SUCCEEDED",
    requestId: "report",
    epoch: 0,
    auditId: "audit-id",
    report: {} as NonNullable<AuditSessionState["report"]>,
  });

  assert.equal(state, edited);
  assert.equal(state.session.report, null);
});

test("a hydrated completed report retires an in-flight local report", () => {
  const hydratedReport = { title: "Hydrated report" } as NonNullable<AuditSessionState["report"]>;
  const lateReport = { title: "Late report" } as NonNullable<AuditSessionState["report"]>;
  let state = readyState({
    session: {
      ...capturedSession,
      path: "unconnected",
      stepId: "complete-u",
    },
  });
  state = auditReducer(state, {
    type: "REPORT_STARTED",
    requestId: "report",
    progress: "analyzing",
  });
  state = auditReducer(state, { type: "HYDRATION_REQUESTED", requestId: "hydrate" });
  state = auditReducer(state, {
    type: "REMOTE_RECONCILED",
    requestId: "hydrate",
    epoch: 0,
    durableRevision: 0,
    quickBooksRevision: 0,
    auditId: "audit-id",
    session: { ...state.session, report: hydratedReport },
    quickBooks: { phase: "idle" },
  });

  assert.equal(state.session.report, hydratedReport);
  assert.equal(state.requests.report, null);
  assert.equal(state.report.phase, "idle");
  const hydrated = state;
  state = auditReducer(state, {
    type: "REPORT_SUCCEEDED",
    requestId: "report",
    epoch: 0,
    auditId: "audit-id",
    report: lateReport,
  });
  assert.equal(state, hydrated);
  assert.equal(state.session.report, hydratedReport);
});

test("changing source clears retired document operation state", () => {
  const state = auditReducer(readyState({
    session: {
      ...capturedSession,
      path: "documents",
      stepId: "connect",
      answers: { connection_choice: "documents" },
    },
    requests: {
      ...INITIAL_AUDIT_CONTROLLER_STATE.requests,
      upload: "upload",
      preflight: "preflight",
    },
    documents: {
      items: [],
      error: "",
      uploadActive: true,
      preflightActive: true,
    },
  }), {
    type: "ANSWER_CHANGED",
    answers: { connection_choice: "questions" },
    clearSource: true,
  });

  assert.equal(state.requests.upload, null);
  assert.equal(state.requests.preflight, null);
  assert.equal(state.documents.uploadActive, false);
  assert.equal(state.documents.preflightActive, false);
});

test("QuickBooks completion changes status without moving questionnaire progress", () => {
  const session = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "bookkeeping",
    answers: { connection_choice: "quickbooks" },
  };
  const state = auditReducer(readyState({
    session,
    quickBooks: { phase: "pending", localAttemptKey: "attempt" },
  }), {
    type: "QBO_CONNECTED",
    epoch: 0,
    localAttemptKey: "attempt",
    companyName: "Audit Company",
  });

  assert.equal(state.session.stepId, "bookkeeping");
  assert.equal(state.quickBooks.phase, "connected");
});

test("stale QuickBooks attempt events cannot replace the active attempt", () => {
  const session = {
    ...capturedSession,
    path: "connected" as const,
    stepId: "goal",
    answers: { connection_choice: "quickbooks" },
  };
  const pending = readyState({
    session,
    quickBooks: { phase: "pending", localAttemptKey: "new-attempt" },
    sourceRevision: 4,
  });
  const stalePending = auditReducer(pending, {
    type: "QBO_PENDING",
    epoch: 0,
    sourceRevision: 4,
    localAttemptKey: "old-attempt",
    advanceToQuestions: true,
  });
  assert.equal(stalePending, pending);

  const connected = auditReducer(pending, {
    type: "QBO_CONNECTED",
    epoch: 0,
    localAttemptKey: "new-attempt",
    companyName: "Audit Company",
  });
  const staleFailure = auditReducer(connected, {
    type: "QBO_FAILED",
    epoch: 0,
    localAttemptKey: "old-attempt",
    error: "Old failure",
    failureStage: "import",
  });
  assert.equal(staleFailure, connected);
});

test("choosing QuickBooks retires document operations from the previous source", () => {
  const state = auditReducer(readyState({
    session: {
      ...capturedSession,
      path: "documents",
      stepId: "document-upload",
      answers: { connection_choice: "documents" },
    },
    requests: {
      ...INITIAL_AUDIT_CONTROLLER_STATE.requests,
      upload: "old-upload",
      preflight: "old-preflight",
    },
    documents: {
      items: [{
        id: "document",
        filename: "books.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        status: "processing",
        errorMessage: null,
        createdAt: "2026-08-31",
      }],
      error: "",
      uploadActive: true,
      preflightActive: true,
    },
  }), {
    type: "QBO_STARTING",
    localAttemptKey: "attempt",
    session: {
      ...capturedSession,
      path: "connected",
      stepId: "connect",
      answers: { connection_choice: "quickbooks" },
    },
  });

  assert.equal(state.quickBooks.phase, "starting");
  assert.equal(state.requests.upload, null);
  assert.equal(state.requests.preflight, null);
  assert.deepEqual(state.documents.items, []);
  assert.equal(state.documents.uploadActive, false);
  assert.equal(state.documents.preflightActive, false);
});
