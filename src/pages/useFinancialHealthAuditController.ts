import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from "react";
import posthog from "posthog-js";
import {
  captureFinancialHealthAuditEmail,
  createFinancialHealthAudit,
  generateFinancialHealthAudit,
  getFinancialHealthAudit,
  listFinancialHealthAuditDocuments,
  notifyFinancialHealthAuditReportStarted,
  preflightFinancialHealthAuditDocuments,
  requestFinancialHealthAuditRecovery,
  startFinancialHealthAuditEmailRecovery,
  startFinancialHealthQuickBooksConnection,
  updateFinancialHealthAudit,
  uploadFinancialHealthAuditDocument,
  verifyFinancialHealthAuditEmailRecovery,
  waitForFinancialHealthAudit,
  waitForFinancialHealthAuditDocuments,
  waitForFinancialHealthQuickBooksConnection,
  type AuditRemoteSession,
  type FinancialHealthAuditEmailChallenge,
  type QuickBooksConnectionState,
} from "../services/financialHealthAudit";
import {
  isFinancialHealthAuditAccessError,
  isFinancialHealthAuditRecoveryConflict,
} from "../services/financialHealthAuditError";
import {
  FLOWS,
  SHARED_FLOW,
  STEPS,
  canContinue,
  fieldIsVisible,
  type AnswerValue,
  type AuditStep,
} from "./financialHealthAuditFlow";
import {
  INITIAL_AUDIT_CONTROLLER_STATE,
  auditReducer,
  decodeAuditStorage,
  encodeAuditStorage,
  leadCaptureDestination,
  projectAuditStorage,
  reconcileRemoteAudit,
  recoveredAuditState,
  selectAuditScreen,
  type AuditControllerState,
  type AuditScreen,
  type AuditSessionState,
  type QuickBooksState,
  type RecoverySession,
} from "./financialHealthAuditState";

const STORAGE_KEY = "porter-financial-health-audit-v2";
const LEGACY_STORAGE_KEY = "porter-financial-health-audit-v1";
const QUICKBOOKS_STARTED_AT_KEY = "porter-financial-health-audit-qbo-started-at";
const RECOVERY_SESSION_KEY = "porter-financial-health-audit-recovery";
const PORTER_APP_URL = "https://app.buildwithporter.com";
const MAX_AUDIT_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_AUDIT_DOCUMENTS = 50;
const MAX_AUDIT_DOCUMENT_TOTAL_BYTES = 200 * 1024 * 1024;
const AUDIT_DOCUMENT_UPLOAD_CONCURRENCY = 4;

type SessionHandle = { id: string; token: string };

export type AuditBrowserPort = {
  origin: string;
  hostname: string;
  pathname: () => string;
  search: () => string;
  readStorage: (key: string) => string | null;
  writeStorage: (key: string, value: string) => void;
  removeStorage: (key: string) => void;
  replaceUrl: (url: string) => void;
  navigate: (url: string) => void;
  scrollToTop: () => void;
};

function windowBrowserPort(): AuditBrowserPort | null {
  if (typeof window === "undefined") return null;
  return {
    origin: window.location.origin,
    hostname: window.location.hostname,
    pathname: () => window.location.pathname,
    search: () => window.location.search,
    readStorage: (key) => window.sessionStorage.getItem(key),
    writeStorage: (key, value) => window.sessionStorage.setItem(key, value),
    removeStorage: (key) => window.sessionStorage.removeItem(key),
    replaceUrl: (url) => window.history.replaceState({}, "", url),
    navigate: (url) => window.location.assign(url),
    scrollToTop: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  };
}

export function trackFinancialHealthAudit(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
) {
  posthog.capture(event, properties);
}

type SaveResult = { handle: SessionHandle; remote: AuditRemoteSession };

type SaveCoordinator = {
  epoch: number;
  enqueue: (snapshot: AuditSessionState) => Promise<SaveResult>;
  seal: () => void;
  quiesce: () => Promise<void>;
  dispose: () => void;
};

function createSaveCoordinator(epoch: number, initialHandle: SessionHandle | null): SaveCoordinator {
  let handle = initialHandle;
  let tail: Promise<void> = Promise.resolve();
  let accepting = true;
  let disposed = false;

  return {
    epoch,
    enqueue(snapshot) {
      if (!accepting || disposed) {
        return Promise.reject(new DOMException("The audit session changed.", "AbortError"));
      }
      let result: SaveResult | null = null;
      const task = tail.then(async () => {
        if (disposed) throw new DOMException("The audit session changed.", "AbortError");
        const remote = handle
          ? await updateFinancialHealthAudit(handle.id, handle.token, snapshot)
          : await createFinancialHealthAudit(snapshot);
        if (disposed) throw new DOMException("The audit session changed.", "AbortError");
        const token = remote.accessToken ?? handle?.token;
        if (!token) throw new Error("Porter did not return an audit access token.");
        handle = { id: remote.id, token };
        result = { handle, remote };
      });
      tail = task.catch(() => undefined);
      return task.then(() => {
        if (!result) throw new Error("The audit save did not return a session.");
        return result;
      });
    },
    seal() { accepting = false; },
    quiesce() { return tail; },
    dispose() { accepting = false; disposed = true; },
  };
}

type QuickBooksMonitor = {
  key: string;
  localAttemptKey: string;
  controller: AbortController;
  promise: Promise<QuickBooksConnectionState>;
};

type ControllerRuntime = {
  epoch: number;
  saveCoordinator: SaveCoordinator | null;
  backgroundSaveTimer: number | null;
  hydrationController: AbortController | null;
  qboMonitor: QuickBooksMonitor | null;
  reportAbort: AbortController | null;
  reportRequestId: string | null;
  reportResumeKey: string | null;
  recoveryRequestId: string | null;
  uploadRequestId: string | null;
  preflightRequestId: string | null;
  skipNextPersistence: boolean;
};

function createRuntime(): ControllerRuntime {
  return {
    epoch: 0,
    saveCoordinator: null,
    backgroundSaveTimer: null,
    hydrationController: null,
    qboMonitor: null,
    reportAbort: null,
    reportRequestId: null,
    reportResumeKey: null,
    recoveryRequestId: null,
    uploadRequestId: null,
    preflightRequestId: null,
    skipNextPersistence: false,
  };
}

function operationId(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function sessionHandle(session: AuditSessionState): SessionHandle | null {
  return session.auditId && session.auditToken
    ? { id: session.auditId, token: session.auditToken }
    : null;
}

function storedRecovery(browser: AuditBrowserPort): RecoverySession | null {
  try {
    const raw = browser.readStorage(RECOVERY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecoverySession>;
    if (
      typeof parsed.state !== "string" ||
      parsed.state.length < 32 ||
      typeof parsed.email !== "string" ||
      !parsed.email.includes("@")
    ) {
      browser.removeStorage(RECOVERY_SESSION_KEY);
      return null;
    }
    return { state: parsed.state, email: parsed.email };
  } catch {
    browser.removeStorage(RECOVERY_SESSION_KEY);
    return null;
  }
}

function getFinancialHealthAuditReturnUrl(browser: AuditBrowserPort): string {
  return new URL("/financial-health-audit", browser.origin).toString();
}

function getPorterAppBase(browser: AuditBrowserPort): string {
  const configuredApp = (import.meta.env.VITE_PORTER_APP_URL as string | undefined)?.replace(/\/$/, "");
  if (configuredApp) return configuredApp;
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(browser.hostname);
  if (localHost) return "http://localhost:5173";
  if (browser.hostname === "dev-landing.buildwithporter.com" || browser.hostname.startsWith("dev.")) {
    return "https://dev.buildwithporter.com";
  }
  return PORTER_APP_URL;
}

function callbackDuration(browser: AuditBrowserPort): number | null {
  const raw = browser.readStorage(QUICKBOOKS_STARTED_AT_KEY);
  browser.removeStorage(QUICKBOOKS_STARTED_AT_KEY);
  if (!raw) return null;
  const startedAt = Number(raw);
  return Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : null;
}

function clearCallbackQuery(browser: AuditBrowserPort, params: URLSearchParams) {
  params.delete("quickbooks");
  params.delete("audit_id");
  const query = params.toString();
  browser.replaceUrl(`${browser.pathname()}${query ? `?${query}` : ""}`);
}

function advancesOnChoice(step: AuditStep): boolean {
  return step.id === "connect";
}

function resetQuickBooksSelection(session: AuditSessionState): AuditSessionState {
  const answers = { ...session.answers };
  delete answers.connection_choice;
  return { ...session, path: null, stepId: "connect", answers };
}

export type FinancialHealthAuditController = {
  state: AuditControllerState;
  screen: AuditScreen;
  titleRef: RefObject<HTMLHeadingElement | null>;
  step: AuditStep;
  flow: string[];
  questionSteps: string[];
  stepIndex: number;
  choiceAdvancesImmediately: boolean;
  quickBooksUiPhase: "idle" | "connecting" | "error";
  quickBooksError: string;
  actions: {
    setAnswer: (name: string, value: AnswerValue) => void;
    uploadDocuments: (files: FileList | File[]) => Promise<void>;
    next: () => void;
    back: () => void;
    restart: () => void;
    beginAudit: (email: string) => Promise<void>;
    startQuickBooks: () => void;
    retryReport: () => void;
    signInToPorter: () => void;
    cancelRecovery: () => void;
    startRecoveryEmail: () => Promise<FinancialHealthAuditEmailChallenge>;
    verifyRecoveryEmail: (challengeId: string, code: string) => Promise<void>;
  };
};

export function useFinancialHealthAuditController(
  suppliedBrowser?: AuditBrowserPort,
): FinancialHealthAuditController {
  // This hook is the sole browser orchestrator. The service owns typed HTTP and
  // polling; canonical QBO import and accounting remain server-owned.
  // The browser port is a runtime dependency, not render state. Its identity
  // must stay fixed so bootstrap cannot retrigger after LOCAL_RESTORED.
  const [browser] = useState<AuditBrowserPort | null>(() => suppliedBrowser ?? windowBrowserPort());
  const [state, dispatch] = useReducer(auditReducer, INITIAL_AUDIT_CONTROLLER_STATE);
  const runtimeRef = useRef<ControllerRuntime>(createRuntime());
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const stepEnteredAtRef = useRef(0);

  const clearQuickBooksMonitor = useCallback(() => {
    const monitor = runtimeRef.current.qboMonitor;
    if (monitor) monitor.controller.abort();
    runtimeRef.current.qboMonitor = null;
  }, []);

  const installCoordinator = useCallback((session: AuditSessionState, epoch: number) => {
    runtimeRef.current.saveCoordinator?.dispose();
    runtimeRef.current.saveCoordinator = createSaveCoordinator(epoch, sessionHandle(session));
  }, []);

  const invalidateAuditAccess = useCallback((
    expectedEpoch: number,
    email: string | null,
    reason: "expired" | "recovery_conflict",
  ) => {
    const runtime = runtimeRef.current;
    if (!browser || runtime.epoch !== expectedEpoch) return;
    runtime.epoch += 1;
    runtime.hydrationController?.abort();
    runtime.qboMonitor?.controller.abort();
    runtime.reportAbort?.abort();
    runtime.saveCoordinator?.dispose();
    if (runtime.backgroundSaveTimer !== null) window.clearTimeout(runtime.backgroundSaveTimer);
    runtime.saveCoordinator = createSaveCoordinator(runtime.epoch, null);
    runtime.backgroundSaveTimer = null;
    runtime.hydrationController = null;
    runtime.qboMonitor = null;
    runtime.reportAbort = null;
    runtime.reportRequestId = null;
    runtime.reportResumeKey = null;
    runtime.recoveryRequestId = null;
    runtime.uploadRequestId = null;
    runtime.preflightRequestId = null;
    // Reason: A stale pre-recovery bearer must not be restored again on refresh.
    // Skip persisting the email-only convenience state because captured email is
    // not proof and LOCAL_RESTORED would otherwise treat it as completed capture.
    runtime.skipNextPersistence = true;
    for (const key of [
      STORAGE_KEY,
      LEGACY_STORAGE_KEY,
      QUICKBOOKS_STARTED_AT_KEY,
      RECOVERY_SESSION_KEY,
    ]) {
      try {
        browser.removeStorage(key);
      } catch {
        trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
      }
    }
    if (reason === "recovery_conflict" && email) {
      // Reason: A recovery CAS loser must discard its stale challenge and shell
      // before retrying. Keep only the entered email so Continue creates a fresh
      // isolated shell and requests the latest recoverable audit again.
      dispatch({ type: "RECOVERY_CONFLICTED", epoch: expectedEpoch, email });
      trackFinancialHealthAudit("financial_health_audit_recovery_conflicted");
    } else {
      dispatch({ type: "ACCESS_EXPIRED", epoch: expectedEpoch, email });
      trackFinancialHealthAudit("financial_health_audit_access_expired");
    }
  }, [browser]);

  const enqueueSave = useCallback(async (snapshot: AuditSessionState): Promise<SessionHandle> => {
    const runtime = runtimeRef.current;
    const epoch = runtime.epoch;
    if (!runtime.saveCoordinator || runtime.saveCoordinator.epoch !== epoch) {
      runtime.saveCoordinator = createSaveCoordinator(epoch, sessionHandle(snapshot));
    }
    const requestId = operationId("save");
    dispatch({ type: "SAVE_REQUESTED", requestId });
    let result: SaveResult;
    try {
      result = await runtime.saveCoordinator.enqueue(snapshot);
    } catch (error) {
      if (isFinancialHealthAuditAccessError(error)) {
        invalidateAuditAccess(epoch, snapshot.capturedEmail, "expired");
      }
      throw error;
    }
    const { handle, remote } = result;
    if (runtimeRef.current.epoch !== epoch) {
      throw new DOMException("The audit session changed.", "AbortError");
    }
    dispatch({
      type: "SAVE_SUCCEEDED",
      requestId,
      epoch,
      auditId: handle.id,
      auditToken: handle.token,
      capturedEmail: remote.capturedEmail ?? snapshot.capturedEmail ?? null,
      capturedFirstName: remote.capturedFirstName ?? snapshot.capturedFirstName ?? null,
    });
    return handle;
  }, [invalidateAuditAccess]);

  const ensureQuickBooksMonitor = useCallback((
    handle: SessionHandle,
    localAttemptKey: string,
  ): Promise<QuickBooksConnectionState> => {
    const runtime = runtimeRef.current;
    const epoch = runtime.epoch;
    const key = `${epoch}:${handle.id}:${localAttemptKey}`;
    if (runtime.qboMonitor?.key === key) return runtime.qboMonitor.promise;
    if (runtime.qboMonitor) runtime.qboMonitor.controller.abort();
    const controller = new AbortController();
    const promise = waitForFinancialHealthQuickBooksConnection(
      handle.id,
      handle.token,
      controller.signal,
    )
      .then((connection) => {
        if (runtimeRef.current.epoch !== epoch || runtimeRef.current.qboMonitor?.key !== key) {
          throw new DOMException("The audit session changed.", "AbortError");
        }
        dispatch({
          type: "QBO_CONNECTED",
          epoch,
          localAttemptKey,
          companyName: connection.companyName,
        });
        trackFinancialHealthAudit("financial_health_audit_quickbooks_import_completed");
        return connection;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (isFinancialHealthAuditAccessError(error)) throw error;
        if (runtimeRef.current.epoch === epoch && runtimeRef.current.qboMonitor?.key === key) {
          dispatch({
            type: "QBO_FAILED",
            epoch,
            localAttemptKey,
            error: error instanceof Error
              ? error.message
              : "QuickBooks could not be imported. Reconnect QuickBooks and try again.",
            failureStage: "import",
          });
          trackFinancialHealthAudit("financial_health_audit_quickbooks_import_failed");
        }
        throw error;
      });
    runtime.qboMonitor = { key, localAttemptKey, controller, promise };
    return promise;
  }, []);

  useEffect(() => {
    if (!browser) return;
    let cancelled = false;
    const recovery = storedRecovery(browser);
    const params = new URLSearchParams(browser.search());
    const callbackStatus = params.get("quickbooks");
    const callbackAuditId = params.get("audit_id");
    let fromLegacy = false;
    const restoreStoredAudit = (storageKey: string) => {
      try {
        const raw = browser.readStorage(storageKey);
        if (!raw) return null;
        const restored = decodeAuditStorage(raw);
        if (!restored) throw new Error("Stored audit is invalid.");
        return restored;
      } catch {
        browser.removeStorage(storageKey);
        trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
        return null;
      }
    };
    let decoded = restoreStoredAudit(STORAGE_KEY);
    if (!decoded) {
      decoded = restoreStoredAudit(LEGACY_STORAGE_KEY);
      fromLegacy = Boolean(decoded);
    }

    if (decoded) {
      let localSession = decoded.session;
      let localQuickBooks = decoded.quickBooks;
      let localCallbackNotice = decoded.callbackNotice;
      const hasLegacyAuthorization = Boolean(browser.readStorage(QUICKBOOKS_STARTED_AT_KEY));
      const importHasStarted =
        localQuickBooks.phase === "pending" ||
        localQuickBooks.phase === "connected" ||
        (localQuickBooks.phase === "failed" && localQuickBooks.failureStage === "import");
      const persistAndConsumeCallback = (): { authorizationDuration: number | null } | null => {
        try {
          const encoded = encodeAuditStorage(localSession, localQuickBooks, localCallbackNotice);
          browser.writeStorage(STORAGE_KEY, encoded);
          const readback = decodeAuditStorage(browser.readStorage(STORAGE_KEY) ?? "");
          if (
            !readback ||
            encodeAuditStorage(readback.session, readback.quickBooks, readback.callbackNotice) !== encoded
          ) throw new Error("The QuickBooks callback could not be stored safely.");
          clearCallbackQuery(browser, params);
          return { authorizationDuration: callbackDuration(browser) };
        } catch {
          trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
          return null;
        }
      };
      if (callbackStatus === "processing" || callbackStatus === "connected") {
        if (
          callbackAuditId &&
          callbackAuditId === localSession.auditId &&
          localSession.auditToken
        ) {
          if (!importHasStarted) {
            const localAttemptKey = operationId("qbo-callback");
            localSession = {
              ...localSession,
              path: "connected",
              stepId: "goal",
              answers: { ...localSession.answers, connection_choice: "quickbooks" },
            };
            localQuickBooks = { phase: "pending", localAttemptKey };
          }
          localCallbackNotice = "";
          const consumed = persistAndConsumeCallback();
          if (consumed) {
            trackFinancialHealthAudit("financial_health_audit_quickbooks_connected", {
              authorization_duration_ms: consumed.authorizationDuration,
            });
          }
        } else {
          if (!importHasStarted && (localQuickBooks.phase === "authorizing" || hasLegacyAuthorization)) {
            localCallbackNotice =
              "QuickBooks returned for a different audit. Reconnect it from this audit and try again.";
          }
          const consumed = persistAndConsumeCallback();
          if (consumed) {
            trackFinancialHealthAudit("financial_health_audit_quickbooks_callback_mismatch", {
              authorization_duration_ms: consumed.authorizationDuration,
            });
          }
        }
      } else if (callbackStatus === "error") {
        const activeAuthorization = localQuickBooks.phase === "authorizing" || hasLegacyAuthorization;
        const callbackMatchesAudit = callbackAuditId === localSession.auditId;
        const callbackTargetsAudit = callbackAuditId ? callbackMatchesAudit : activeAuthorization;
        const acceptCallback = callbackTargetsAudit && !importHasStarted;
        if (acceptCallback) {
          localSession = resetQuickBooksSelection(localSession);
          localQuickBooks = {
            phase: "failed",
            error: "QuickBooks was not connected. Try again or continue without it.",
            failureStage: "authorization",
            localAttemptKey: "localAttemptKey" in decoded.quickBooks
              ? decoded.quickBooks.localAttemptKey
              : operationId("qbo-callback-error"),
          };
          localCallbackNotice = "";
          const consumed = persistAndConsumeCallback();
          if (consumed) {
            trackFinancialHealthAudit("financial_health_audit_quickbooks_failed", {
              authorization_duration_ms: consumed.authorizationDuration,
            });
          }
        } else {
          if (!importHasStarted && activeAuthorization && callbackAuditId && !callbackMatchesAudit) {
            localCallbackNotice =
              "QuickBooks returned for a different audit. Reconnect it from this audit and try again.";
          }
          const consumed = persistAndConsumeCallback();
          if (consumed) {
            trackFinancialHealthAudit("financial_health_audit_quickbooks_callback_mismatch", {
              authorization_duration_ms: consumed.authorizationDuration,
            });
          }
        }
      } else if (callbackStatus) {
        clearCallbackQuery(browser, params);
        trackFinancialHealthAudit("financial_health_audit_quickbooks_callback_mismatch", {
          callback_status: callbackStatus,
        });
      }
      installCoordinator(localSession, runtimeRef.current.epoch);
      dispatch({
        type: "LOCAL_RESTORED",
        session: localSession,
        quickBooks: localQuickBooks,
        callbackNotice: localCallbackNotice,
        recovery,
      });
      if (fromLegacy) {
        try {
          const encoded = encodeAuditStorage(localSession, localQuickBooks, localCallbackNotice);
          browser.writeStorage(STORAGE_KEY, encoded);
          if (!decodeAuditStorage(browser.readStorage(STORAGE_KEY) ?? "")) {
            throw new Error("Stored audit migration could not be verified.");
          }
          browser.removeStorage(LEGACY_STORAGE_KEY);
        } catch {
          trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
        }
      }
      if (localSession.auditId && localSession.auditToken) {
        const requestId = operationId("hydrate");
        const epoch = runtimeRef.current.epoch;
        const durableRevision = 0;
        const quickBooksRevision = 0;
        const auditId = localSession.auditId;
        const controller = new AbortController();
        runtimeRef.current.hydrationController = controller;
        dispatch({ type: "HYDRATION_REQUESTED", requestId });
        const timeout = window.setTimeout(() => controller.abort(), 5_000);
        void getFinancialHealthAudit(auditId, localSession.auditToken, controller.signal)
          .then((remote) => {
            if (cancelled) return;
            const reconciled = reconcileRemoteAudit(localSession, localQuickBooks, remote);
            dispatch({
              type: "REMOTE_RECONCILED",
              requestId,
              epoch,
              durableRevision,
              quickBooksRevision,
              auditId,
              session: reconciled.session,
              quickBooks: reconciled.quickBooks,
            });
          })
          .catch((error: unknown) => {
            if (!cancelled && isFinancialHealthAuditAccessError(error)) {
              invalidateAuditAccess(epoch, localSession.capturedEmail, "expired");
            }
          })
          .finally(() => window.clearTimeout(timeout));
      }
    } else {
      if (callbackStatus) clearCallbackQuery(browser, params);
      installCoordinator(INITIAL_AUDIT_CONTROLLER_STATE.session, runtimeRef.current.epoch);
      dispatch({ type: "LOCAL_RESTORE_EMPTY", recovery });
    }
    trackFinancialHealthAudit("financial_health_audit_viewed");
    const hydrationController = runtimeRef.current.hydrationController;
    return () => {
      cancelled = true;
      hydrationController?.abort();
    };
  }, [browser, installCoordinator, invalidateAuditAccess]);

  useEffect(() => {
    if (!browser || state.hydration !== "ready") return;
    if (runtimeRef.current.skipNextPersistence) {
      runtimeRef.current.skipNextPersistence = false;
      return;
    }
    try {
      browser.writeStorage(
        STORAGE_KEY,
        encodeAuditStorage(state.session, state.quickBooks, state.callbackNotice),
      );
    } catch {
      trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
    }
  }, [
    browser,
    state.callbackNotice,
    state.epoch,
    state.hydration,
    state.quickBooks,
    state.session,
  ]);

  useEffect(() => {
    if (
      state.hydration !== "ready" ||
      state.session.path !== "connected" ||
      (state.quickBooks.phase !== "pending" &&
        !(state.quickBooks.phase === "failed" && state.quickBooks.failureStage === "import"))
    ) return;
    const handle = sessionHandle(state.session);
    if (!handle) return;
    const epoch = state.epoch;
    void ensureQuickBooksMonitor(handle, state.quickBooks.localAttemptKey).catch((error: unknown) => {
      if (isFinancialHealthAuditAccessError(error)) {
        invalidateAuditAccess(epoch, state.session.capturedEmail, "expired");
      }
    });
  }, [ensureQuickBooksMonitor, invalidateAuditAccess, state.epoch, state.hydration, state.quickBooks, state.session]);

  const refreshDocuments = useCallback(async (
    handle: SessionHandle,
    epoch: number,
    sourceRevision: number,
  ) => {
    try {
      const items = await listFinancialHealthAuditDocuments(handle.id, handle.token);
      dispatch({ type: "DOCUMENTS_REFRESHED", items, epoch, sourceRevision });
    } catch (error) {
      dispatch({
        type: "DOCUMENT_ERROR",
        error: error instanceof Error ? error.message : "We could not check your uploaded files.",
        epoch,
        sourceRevision,
      });
    }
  }, []);

  useEffect(() => {
    if (
      state.hydration !== "ready" ||
      state.session.path !== "documents" ||
      !state.session.auditId ||
      !state.session.auditToken
    ) return;
    const handle = sessionHandle(state.session);
    if (handle) void refreshDocuments(handle, state.epoch, state.sourceRevision);
  }, [refreshDocuments, state.epoch, state.hydration, state.session, state.sourceRevision]);

  useEffect(() => {
    if (
      state.session.path !== "documents" ||
      !state.documents.items.some((document) => document.status === "uploading" || document.status === "processing")
    ) return;
    const handle = sessionHandle(state.session);
    if (!handle) return;
    const timer = window.setInterval(
      () => void refreshDocuments(handle, state.epoch, state.sourceRevision),
      2_000,
    );
    return () => window.clearInterval(timer);
  }, [refreshDocuments, state.documents.items, state.epoch, state.session, state.sourceRevision]);

  useEffect(() => {
    if (
      state.hydration !== "ready" ||
      state.leadCapture !== "complete" ||
      state.recovery.session ||
      !state.session.capturedEmail ||
      state.session.report ||
      STEPS[state.session.stepId].kind === "report" ||
      Object.keys(state.session.answers).length === 0 ||
      state.quickBooks.phase === "starting" ||
      state.quickBooks.phase === "authorizing"
    ) return;
    const runtime = runtimeRef.current;
    const timer = window.setTimeout(() => {
      if (runtime.backgroundSaveTimer === timer) {
        runtime.backgroundSaveTimer = null;
      }
      void enqueueSave(state.session).catch(() => undefined);
    }, 500);
    runtime.backgroundSaveTimer = timer;
    return () => {
      window.clearTimeout(timer);
      if (runtime.backgroundSaveTimer === timer) {
        runtime.backgroundSaveTimer = null;
      }
    };
  }, [
    enqueueSave,
    state.hydration,
    state.leadCapture,
    state.quickBooks.phase,
    state.recovery.session,
    state.session,
  ]);

  useEffect(() => {
    if (state.hydration !== "ready" || !browser) return;
    stepEnteredAtRef.current = Date.now();
    titleRef.current?.focus({ preventScroll: true });
    browser.scrollToTop();
    trackFinancialHealthAudit("financial_health_audit_step_viewed", {
      step_id: state.session.stepId,
      path: state.session.path ?? "shared",
    });
  }, [browser, state.hydration, state.session.path, state.session.stepId]);

  useEffect(() => () => {
    const runtime = runtimeRef.current;
    runtime.hydrationController?.abort();
    runtime.qboMonitor?.controller.abort();
    runtime.reportAbort?.abort();
    runtime.saveCoordinator?.dispose();
    if (runtime.backgroundSaveTimer !== null) {
      window.clearTimeout(runtime.backgroundSaveTimer);
      runtime.backgroundSaveTimer = null;
    }
    runtime.recoveryRequestId = null;
  }, []);

  const requestReport = useCallback(async (
    snapshot: AuditSessionState,
    quickBooks: QuickBooksState,
    reuseSavedAudit = false,
  ) => {
    const runtime = runtimeRef.current;
    if (runtime.reportRequestId) return;
    const requestId = operationId("report");
    const epoch = runtime.epoch;
    runtime.reportRequestId = requestId;
    runtime.reportAbort?.abort();
    const controller = new AbortController();
    runtime.reportAbort = controller;
    const startedAt = Date.now();
    dispatch({
      type: "REPORT_STARTED",
      requestId,
      progress: snapshot.path === "documents" ? "reading" : "saving",
    });
    try {
      const handle = reuseSavedAudit ? sessionHandle(snapshot) : await enqueueSave(snapshot);
      if (!handle) throw new Error("This audit cannot generate a report yet.");
      if (snapshot.path && snapshot.capturedEmail) {
        void notifyFinancialHealthAuditReportStarted(handle.id, snapshot.capturedEmail)
          .catch(() => trackFinancialHealthAudit("financial_health_audit_waitlist_notification_failed", {
            path: snapshot.path,
            status: 0,
          }));
      }
      if (snapshot.path === "documents") {
        dispatch({ type: "REPORT_PROGRESS", requestId, progress: "reading" });
        await waitForFinancialHealthAuditDocuments(
          handle.id,
          handle.token,
          controller.signal,
          (items) => dispatch({
            type: "DOCUMENTS_REFRESHED",
            items,
            epoch,
            sourceRevision: state.sourceRevision,
          }),
          () => runtimeRef.current.uploadRequestId !== null,
        );
      }
      if (snapshot.path === "connected" && quickBooks.phase !== "connected") {
        dispatch({ type: "REPORT_PROGRESS", requestId, thinking: "Importing your QuickBooks records" });
        const localAttemptKey = "localAttemptKey" in quickBooks && quickBooks.localAttemptKey
          ? quickBooks.localAttemptKey
          : operationId("qbo-report");
        if (quickBooks.phase !== "pending") {
          dispatch({
            type: "QBO_PENDING",
            epoch,
            sourceRevision: state.sourceRevision,
            localAttemptKey,
            advanceToQuestions: false,
          });
        }
        try {
          await ensureQuickBooksMonitor(handle, localAttemptKey);
        } catch (error) {
          dispatch({ type: "REPORT_QBO_RECOVERY", requestId });
          throw error;
        }
        dispatch({ type: "REPORT_PROGRESS", requestId, thinking: "" });
      }
      dispatch({ type: "REPORT_PROGRESS", requestId, progress: "analyzing" });
      const started = await generateFinancialHealthAudit(handle.id, handle.token);
      const remote = started.status === "completed" && started.report
        ? started
        : await waitForFinancialHealthAudit(
            handle.id,
            handle.token,
            controller.signal,
            (progress) => dispatch({
              type: "REPORT_PROGRESS",
              requestId,
              thinking: progress.generationActivity ?? "",
            }),
          );
      if (!remote.report) throw new Error("Porter did not return a report.");
      dispatch({
        type: "REPORT_SUCCEEDED",
        requestId,
        epoch,
        auditId: remote.id,
        report: remote.report,
      });
      trackFinancialHealthAudit("financial_health_audit_report_generated", {
        path: snapshot.path ?? "unknown",
        duration_ms: Date.now() - startedAt,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        if (isFinancialHealthAuditAccessError(error)) {
          invalidateAuditAccess(epoch, snapshot.capturedEmail, "expired");
          return;
        }
        dispatch({
          type: "REPORT_FAILED",
          requestId,
          epoch,
          error: error instanceof Error ? error.message : "The report could not be generated. Try again.",
        });
        trackFinancialHealthAudit("financial_health_audit_report_failed", {
          path: snapshot.path ?? "unknown",
          duration_ms: Date.now() - startedAt,
        });
      }
    } finally {
      if (runtimeRef.current.epoch === epoch && runtimeRef.current.reportRequestId === requestId) {
        runtimeRef.current.reportRequestId = null;
        if (runtimeRef.current.reportAbort === controller) runtimeRef.current.reportAbort = null;
      }
    }
  }, [enqueueSave, ensureQuickBooksMonitor, invalidateAuditAccess, state.sourceRevision]);

  useEffect(() => {
    if (
      state.hydration !== "ready" ||
      state.report.phase !== "generating" ||
      state.session.report ||
      STEPS[state.session.stepId].kind !== "report" ||
      !state.session.auditId ||
      !state.session.auditToken
    ) return;
    const resumeKey = `${state.epoch}:${state.session.auditId}`;
    if (runtimeRef.current.reportResumeKey === resumeKey) return;
    runtimeRef.current.reportResumeKey = resumeKey;
    void requestReport(state.session, state.quickBooks, true);
  }, [requestReport, state]);

  const uploadDocuments = useCallback(async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (
      !selectedFiles.length ||
      state.documents.uploadActive ||
      runtimeRef.current.uploadRequestId ||
      runtimeRef.current.preflightRequestId
    ) return;
    const oversizedFile = selectedFiles.find((file) => file.size > MAX_AUDIT_DOCUMENT_BYTES);
    if (oversizedFile) {
      dispatch({ type: "DOCUMENT_ERROR", error: `${oversizedFile.name} is larger than the 50MB file limit.` });
      return;
    }
    if (state.documents.items.length + selectedFiles.length > MAX_AUDIT_DOCUMENTS) {
      dispatch({ type: "DOCUMENT_ERROR", error: `A financial health audit can include up to ${MAX_AUDIT_DOCUMENTS} files.` });
      return;
    }
    const existingBytes = state.documents.items.reduce((total, document) => total + (document.sizeBytes ?? 0), 0);
    const selectedBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    if (existingBytes + selectedBytes > MAX_AUDIT_DOCUMENT_TOTAL_BYTES) {
      dispatch({ type: "DOCUMENT_ERROR", error: "The files in this audit exceed the 200MB combined limit." });
      return;
    }
    const requestId = operationId("upload");
    const epoch = state.epoch;
    const sourceRevision = state.sourceRevision;
    runtimeRef.current.uploadRequestId = requestId;
    const isCurrentUpload = () => (
      runtimeRef.current.epoch === epoch &&
      runtimeRef.current.uploadRequestId === requestId
    );
    dispatch({ type: "UPLOAD_STARTED", requestId });
    try {
      const handle = await enqueueSave({ ...state.session, path: "documents", stepId: "document-upload" });
      if (!isCurrentUpload()) return;
      let completedUploads = 0;
      const settled: PromiseSettledResult<unknown>[] = [];
      for (let offset = 0; offset < selectedFiles.length; offset += AUDIT_DOCUMENT_UPLOAD_CONCURRENCY) {
        if (!isCurrentUpload()) return;
        const batch = selectedFiles.slice(offset, offset + AUDIT_DOCUMENT_UPLOAD_CONCURRENCY);
        const results = await Promise.allSettled(batch.map(async (file) => {
          const document = await uploadFinancialHealthAuditDocument(handle.id, handle.token, file);
          completedUploads += 1;
          dispatch({
            type: "UPLOAD_DOCUMENT_READY",
            requestId,
            epoch,
            sourceRevision,
            document,
          });
          return document;
        }));
        settled.push(...results);
      }
      if (!isCurrentUpload()) return;
      await refreshDocuments(handle, epoch, sourceRevision);
      if (!isCurrentUpload()) return;
      const failures = settled.filter((result) => result.status === "rejected");
      if (failures.length) {
        const first = failures[0] as PromiseRejectedResult;
        dispatch({
          type: "DOCUMENT_ERROR",
          epoch,
          sourceRevision,
          error: failures.length === 1
            ? (first.reason instanceof Error ? first.reason.message : "One file could not be uploaded.")
            : `${failures.length} files could not be uploaded. Try them again.`,
        });
      }
      trackFinancialHealthAudit("financial_health_audit_documents_uploaded", {
        document_count: completedUploads,
      });
    } catch (error) {
      dispatch({
        type: "DOCUMENT_ERROR",
        epoch,
        sourceRevision,
        error: error instanceof Error ? error.message : "We could not upload those files. Try them again.",
      });
    } finally {
      if (isCurrentUpload()) runtimeRef.current.uploadRequestId = null;
      dispatch({ type: "UPLOAD_FINISHED", requestId, epoch, sourceRevision });
    }
  }, [enqueueSave, refreshDocuments, state]);

  const advance = useCallback(async (snapshot: AuditSessionState) => {
    const activeStep = STEPS[snapshot.stepId];
    if (!canContinue(activeStep, snapshot.answers)) {
      const missingRequiredText = activeStep.fields?.some(
        (field) =>
          field.type === "textarea" &&
          field.required === true &&
          fieldIsVisible(field, snapshot.answers) &&
          !String(snapshot.answers[field.name] ?? "").trim(),
      );
      dispatch({
        type: "VALIDATION_CHANGED",
        message: missingRequiredText ? "Add a little detail to continue." : "Choose an answer to continue.",
      });
      return;
    }
    trackFinancialHealthAudit("financial_health_audit_step_completed", {
      step_id: activeStep.id,
      path: snapshot.path ?? "shared",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });
    if (activeStep.id === "business-type") trackFinancialHealthAudit("financial_health_audit_started");
    if (activeStep.id === "connect") {
      if (snapshot.answers.connection_choice === "quickbooks") return;
      if (snapshot.answers.connection_choice === "documents") {
        trackFinancialHealthAudit("financial_health_audit_connection_selected", { selection: "uploaded_documents" });
        dispatch({
          type: "SESSION_REPLACED",
          session: { ...snapshot, path: "documents", stepId: "document-upload" },
          sourceChanged: true,
        });
        return;
      }
      trackFinancialHealthAudit("financial_health_audit_connection_selected", { selection: "questions" });
      dispatch({
        type: "SESSION_REPLACED",
        session: { ...snapshot, path: "unconnected", stepId: "context" },
        sourceChanged: true,
      });
      return;
    }
    if (activeStep.kind === "documents") {
      if (runtimeRef.current.preflightRequestId) return;
      const readyDocuments = state.documents.items.filter((document) => document.status === "ready");
      const processingDocuments = state.documents.items.some((document) => document.status === "processing");
      const uploadingDocuments = state.documents.uploadActive || state.documents.items.some((document) => document.status === "uploading");
      if (!readyDocuments.length && !processingDocuments) {
        dispatch({
          type: "VALIDATION_CHANGED",
          message: uploadingDocuments
            ? "Your files are still uploading. Continue once Porter starts reading them."
            : "Upload at least one financial file for a document-backed audit.",
        });
        return;
      }
      const requestId = operationId("preflight");
      const epoch = state.epoch;
      const sourceRevision = state.sourceRevision;
      runtimeRef.current.preflightRequestId = requestId;
      const isCurrentPreflight = () => (
        runtimeRef.current.epoch === epoch &&
        runtimeRef.current.preflightRequestId === requestId
      );
      dispatch({ type: "PREFLIGHT_STARTED", requestId });
      dispatch({ type: "VALIDATION_CHANGED", message: "Porter is checking whether these files can support your report." });
      try {
        const handle = await enqueueSave({ ...snapshot, path: "documents", stepId: "document-upload" });
        if (!isCurrentPreflight()) return;
        await waitForFinancialHealthAuditDocuments(
          handle.id,
          handle.token,
          undefined,
          (items) => dispatch({ type: "DOCUMENTS_REFRESHED", items, epoch, sourceRevision }),
          () => runtimeRef.current.uploadRequestId !== null,
        );
        if (!isCurrentPreflight()) return;
        const preflight = await preflightFinancialHealthAuditDocuments(handle.id, handle.token);
        if (!isCurrentPreflight()) return;
        if (!preflight.eligible) {
          dispatch({ type: "DOCUMENT_ERROR", error: preflight.message, epoch, sourceRevision });
          dispatch({ type: "VALIDATION_CHANGED", message: "" });
          trackFinancialHealthAudit("financial_health_audit_documents_preflight_failed");
          return;
        }
      } catch (error) {
        dispatch({
          type: "DOCUMENT_ERROR",
          epoch,
          sourceRevision,
          error: error instanceof Error ? error.message : "Porter could not check these files. Try again.",
        });
        dispatch({ type: "VALIDATION_CHANGED", message: "" });
        return;
      } finally {
        if (isCurrentPreflight()) runtimeRef.current.preflightRequestId = null;
        dispatch({ type: "PREFLIGHT_FINISHED", requestId, epoch, sourceRevision });
      }
    }
    const activeFlow = snapshot.path ? FLOWS[snapshot.path] : SHARED_FLOW;
    const nextId = activeFlow[activeFlow.indexOf(snapshot.stepId) + 1];
    if (!nextId) return;
    const nextSession = { ...snapshot, stepId: nextId, report: null };
    dispatch({ type: "SESSION_REPLACED", session: nextSession });
    if (STEPS[nextId].kind === "report") {
      void requestReport(nextSession, state.quickBooks);
    }
  }, [enqueueSave, requestReport, state]);

  const setAnswer = useCallback((name: string, value: AnswerValue) => {
    const step = STEPS[state.session.stepId];
    const nextAnswers = { ...state.session.answers, [name]: value };
    for (const field of step.fields ?? []) {
      if (field.showIf && !fieldIsVisible(field, nextAnswers)) delete nextAnswers[field.name];
    }
    const clearSource = name === "connection_choice" &&
      (value === "questions" || value === "skip" || value === "documents");
    if (clearSource) {
      clearQuickBooksMonitor();
      runtimeRef.current.uploadRequestId = null;
      runtimeRef.current.preflightRequestId = null;
    }
    const nextSession: AuditSessionState = {
      ...state.session,
      path: clearSource ? null : state.session.path,
      answers: nextAnswers,
    };
    dispatch({ type: "ANSWER_CHANGED", answers: nextAnswers, clearSource });
    if (advancesOnChoice(step)) void advance(nextSession);
  }, [advance, clearQuickBooksMonitor, state.session]);

  const startQuickBooks = useCallback(() => {
    if (
      !browser ||
      state.quickBooks.phase === "starting" ||
      (state.quickBooks.phase === "authorizing" && !state.callbackNotice)
    ) return;
    clearQuickBooksMonitor();
    const localAttemptKey = operationId("qbo");
    const epoch = runtimeRef.current.epoch;
    const sourceRevision = state.sourceRevision + 1;
    const snapshot: AuditSessionState = {
      ...state.session,
      path: "connected",
      stepId: "connect",
      report: null,
      answers: { ...state.session.answers, connection_choice: "quickbooks" },
    };
    if (runtimeRef.current.backgroundSaveTimer !== null) {
      window.clearTimeout(runtimeRef.current.backgroundSaveTimer);
      runtimeRef.current.backgroundSaveTimer = null;
    }
    runtimeRef.current.uploadRequestId = null;
    runtimeRef.current.preflightRequestId = null;
    dispatch({ type: "QBO_STARTING", localAttemptKey, session: snapshot });
    trackFinancialHealthAudit("financial_health_audit_step_completed", {
      step_id: "connect",
      path: "connected",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });
    trackFinancialHealthAudit("financial_health_audit_connection_selected", { selection: "uses_quickbooks" });

    void (async () => {
      try {
        // Reason: This save sits after every older queued source save and is
        // awaited before OAuth, so the remote audit's final source is QBO.
        const handle = await enqueueSave(snapshot);
        const connection = await startFinancialHealthQuickBooksConnection(
          handle.id,
          handle.token,
          getFinancialHealthAuditReturnUrl(browser),
        );
        if (runtimeRef.current.epoch !== epoch) return;
        if (!connection.authUrl) {
          dispatch({
            type: "QBO_PENDING",
            epoch,
            sourceRevision,
            localAttemptKey,
            advanceToQuestions: true,
          });
          trackFinancialHealthAudit("financial_health_audit_quickbooks_import_resumed");
          return;
        }
        dispatch({ type: "QBO_AUTHORIZING", localAttemptKey });
        const persistedSession = { ...snapshot, auditId: handle.id, auditToken: handle.token };
        const persisted = projectAuditStorage(
          persistedSession,
          { phase: "authorizing", localAttemptKey },
        );
        browser.writeStorage(STORAGE_KEY, JSON.stringify(persisted));
        const readback = decodeAuditStorage(browser.readStorage(STORAGE_KEY) ?? "");
        if (
          !readback ||
          readback.session.auditId !== handle.id ||
          readback.session.auditToken !== handle.token ||
          readback.session.path !== "connected" ||
          readback.session.answers.connection_choice !== "quickbooks" ||
          readback.quickBooks.phase !== "authorizing"
        ) {
          throw new Error("Porter could not safely save this QuickBooks handoff. Try again.");
        }
        browser.writeStorage(QUICKBOOKS_STARTED_AT_KEY, String(Date.now()));
        trackFinancialHealthAudit("financial_health_audit_quickbooks_authorization_started", {
          step_duration_ms: Date.now() - stepEnteredAtRef.current,
        });
        browser.navigate(connection.authUrl);
      } catch (error) {
        dispatch({
          type: "QBO_FAILED",
          epoch,
          localAttemptKey,
          error: error instanceof Error
            ? error.message
            : "QuickBooks could not be opened. Try again or continue without it.",
          failureStage: "authorization",
          resetChoice: true,
        });
        trackFinancialHealthAudit("financial_health_audit_quickbooks_failed");
      }
    })();
  }, [
    browser,
    clearQuickBooksMonitor,
    enqueueSave,
    state.callbackNotice,
    state.quickBooks.phase,
    state.session,
    state.sourceRevision,
  ]);

  const back = useCallback(() => {
    const activeFlow = state.session.path ? FLOWS[state.session.path] : SHARED_FLOW;
    const index = activeFlow.indexOf(state.session.stepId);
    if (index <= 0) return;
    dispatch({ type: "STEP_CHANGED", stepId: activeFlow[index - 1] });
  }, [state.session]);

  const restart = useCallback(() => {
    if (!browser) return;
    const runtime = runtimeRef.current;
    runtime.epoch += 1;
    runtime.hydrationController?.abort();
    runtime.qboMonitor?.controller.abort();
    runtime.reportAbort?.abort();
    runtime.saveCoordinator?.dispose();
    if (runtime.backgroundSaveTimer !== null) window.clearTimeout(runtime.backgroundSaveTimer);
    runtime.saveCoordinator = createSaveCoordinator(runtime.epoch, null);
    runtime.backgroundSaveTimer = null;
    runtime.qboMonitor = null;
    runtime.reportAbort = null;
    runtime.reportRequestId = null;
    runtime.reportResumeKey = null;
    runtime.recoveryRequestId = null;
    runtime.uploadRequestId = null;
    runtime.preflightRequestId = null;
    runtime.skipNextPersistence = true;
    for (const key of [
      STORAGE_KEY,
      LEGACY_STORAGE_KEY,
      QUICKBOOKS_STARTED_AT_KEY,
      RECOVERY_SESSION_KEY,
    ]) {
      try {
        browser.removeStorage(key);
      } catch {
        trackFinancialHealthAudit("financial_health_audit_storage_restore_failed");
      }
    }
    dispatch({ type: "RESTARTED" });
    trackFinancialHealthAudit("financial_health_audit_restarted");
  }, [browser]);

  const beginAudit = useCallback(async (email: string) => {
    if (!browser) return;
    const normalizedEmail = email.trim().toLowerCase();
    dispatch({ type: "LEAD_CAPTURE_STARTED" });
    let recoveryRequest: { id: string; epoch: number } | null = null;
    try {
      const snapshot = { ...state.session, capturedEmail: normalizedEmail };
      const handle = await enqueueSave(snapshot);
      const captured = await captureFinancialHealthAuditEmail(handle.id, handle.token, normalizedEmail);
      if (leadCaptureDestination(captured.recoveryAvailable) === "recovery") {
        recoveryRequest = {
          id: operationId("recovery"),
          epoch: runtimeRef.current.epoch,
        };
        runtimeRef.current.recoveryRequestId = recoveryRequest.id;
        dispatch({ type: "RECOVERY_REQUESTED", requestId: recoveryRequest.id });
        const recovery = await requestFinancialHealthAuditRecovery(handle.id, handle.token);
        if (
          runtimeRef.current.epoch !== recoveryRequest.epoch ||
          runtimeRef.current.recoveryRequestId !== recoveryRequest.id
        ) throw new DOMException("The recovery request changed.", "AbortError");
        const recoverySession = { state: recovery.state, email: normalizedEmail };
        browser.writeStorage(RECOVERY_SESSION_KEY, JSON.stringify(recoverySession));
        dispatch({
          type: "RECOVERY_REQUIRED",
          requestId: recoveryRequest.id,
          epoch: recoveryRequest.epoch,
          session: recoverySession,
        });
        runtimeRef.current.recoveryRequestId = null;
        trackFinancialHealthAudit("financial_health_audit_recovery_required", { path: state.session.path });
        return;
      }
      const nextSession: AuditSessionState = {
        ...state.session,
        stepId: "business-type",
        auditId: handle.id,
        auditToken: handle.token,
        capturedEmail: captured.capturedEmail ?? normalizedEmail,
        capturedFirstName: captured.capturedFirstName ?? null,
        report: null,
      };
      await enqueueSave(nextSession);
      dispatch({ type: "LEAD_CAPTURE_COMPLETED", session: nextSession });
      trackFinancialHealthAudit("financial_health_audit_lead_captured", { path: state.session.path });
    } catch (error) {
      if (
        recoveryRequest &&
        runtimeRef.current.recoveryRequestId === recoveryRequest.id
      ) {
        runtimeRef.current.recoveryRequestId = null;
        dispatch({
          type: "RECOVERY_FAILED",
          requestId: recoveryRequest.id,
          epoch: recoveryRequest.epoch,
          error: error instanceof Error ? error.message : "This saved audit could not be opened.",
        });
      }
      dispatch({ type: "LEAD_CAPTURE_FAILED" });
      throw error;
    }
  }, [browser, enqueueSave, state.session]);

  const cancelRecovery = useCallback(() => {
    restart();
  }, [restart]);

  const startRecoveryEmail = useCallback(async () => {
    const recovery = state.recovery.session;
    if (!recovery) throw new Error("This recovery session is no longer available.");
    return startFinancialHealthAuditEmailRecovery(recovery.state);
  }, [state.recovery.session]);

  const verifyRecoveryEmail = useCallback(async (challengeId: string, code: string) => {
    const epoch = runtimeRef.current.epoch;
    const requestId = operationId("recovery-verify");
    let sealedCoordinator: SaveCoordinator | null = null;
    runtimeRef.current.recoveryRequestId = requestId;
    dispatch({ type: "RECOVERY_REQUESTED", requestId });
    try {
      const recovered = await verifyFinancialHealthAuditEmailRecovery(challengeId, code);
      if (
        runtimeRef.current.epoch !== epoch ||
        runtimeRef.current.recoveryRequestId !== requestId
      ) throw new DOMException("The audit session changed.", "AbortError");
      const previous = runtimeRef.current.saveCoordinator;
      if (runtimeRef.current.backgroundSaveTimer !== null) {
        window.clearTimeout(runtimeRef.current.backgroundSaveTimer);
        runtimeRef.current.backgroundSaveTimer = null;
      }
      sealedCoordinator = previous;
      previous?.seal();
      await previous?.quiesce();
      if (
        runtimeRef.current.epoch !== epoch ||
        runtimeRef.current.recoveryRequestId !== requestId
      ) throw new DOMException("The audit session changed.", "AbortError");
      const restored = recoveredAuditState(recovered);
      if (browser) {
        browser.writeStorage(
          STORAGE_KEY,
          encodeAuditStorage(restored.session, restored.quickBooks),
        );
        const readback = decodeAuditStorage(browser.readStorage(STORAGE_KEY) ?? "");
        if (
          !readback ||
          readback.session.auditId !== restored.session.auditId ||
          readback.session.auditToken !== restored.session.auditToken ||
          readback.session.capturedEmail !== restored.session.capturedEmail
        ) throw new Error("This saved audit could not be installed safely. Try the code again.");
        browser.removeStorage(LEGACY_STORAGE_KEY);
        browser.removeStorage(RECOVERY_SESSION_KEY);
      }
      previous?.dispose();
      runtimeRef.current.qboMonitor?.controller.abort();
      runtimeRef.current.reportAbort?.abort();
      runtimeRef.current.epoch += 1;
      runtimeRef.current.saveCoordinator = createSaveCoordinator(
        runtimeRef.current.epoch,
        sessionHandle(restored.session),
      );
      runtimeRef.current.qboMonitor = null;
      runtimeRef.current.reportAbort = null;
      runtimeRef.current.reportRequestId = null;
      runtimeRef.current.reportResumeKey = null;
      dispatch({
        type: "RECOVERY_INSTALLED",
        requestId,
        epoch,
        session: restored.session,
        quickBooks: restored.quickBooks,
      });
      runtimeRef.current.recoveryRequestId = null;
      trackFinancialHealthAudit("financial_health_audit_recovered", {
        path: restored.session.path,
        method: "email_code",
      });
    } catch (error) {
      if (
        isFinancialHealthAuditRecoveryConflict(error) &&
        runtimeRef.current.epoch === epoch &&
        runtimeRef.current.recoveryRequestId === requestId
      ) {
        invalidateAuditAccess(
          epoch,
          state.recovery.session?.email ?? state.session.capturedEmail,
          "recovery_conflict",
        );
      }
      if (
        sealedCoordinator &&
        runtimeRef.current.epoch === epoch &&
        runtimeRef.current.saveCoordinator === sealedCoordinator
      ) {
        sealedCoordinator.dispose();
        runtimeRef.current.saveCoordinator = createSaveCoordinator(epoch, sessionHandle(state.session));
      }
      if (runtimeRef.current.recoveryRequestId === requestId) {
        runtimeRef.current.recoveryRequestId = null;
        dispatch({
          type: "RECOVERY_FAILED",
          requestId,
          epoch,
          error: error instanceof Error ? error.message : "This saved audit could not be opened.",
        });
      }
      throw error;
    }
  }, [browser, invalidateAuditAccess, state.recovery.session?.email, state.session]);

  const signInToPorter = useCallback(() => {
    if (browser) browser.navigate(getPorterAppBase(browser));
  }, [browser]);

  const screen = selectAuditScreen(state);
  const step = screen === "lead" ? STEPS["lead-capture"] : STEPS[state.session.stepId];
  const flow = state.session.path ? FLOWS[state.session.path] : SHARED_FLOW;
  const questionSteps = flow.filter((id) => {
    const kind = STEPS[id].kind;
    return kind !== "lead" && kind !== "report";
  });
  const stepIndex = Math.max(0, flow.indexOf(state.session.stepId));
  const quickBooksUiPhase = state.callbackNotice
    ? "error"
    : state.quickBooks.phase === "starting" || state.quickBooks.phase === "authorizing"
      ? "connecting"
      : state.quickBooks.phase === "failed" && state.quickBooks.failureStage === "authorization"
        ? "error"
        : "idle";
  const quickBooksError = state.callbackNotice || (state.quickBooks.phase === "failed" ? state.quickBooks.error : "");

  return {
    state,
    screen,
    titleRef,
    step,
    flow,
    questionSteps,
    stepIndex,
    choiceAdvancesImmediately: advancesOnChoice(step),
    quickBooksUiPhase,
    quickBooksError,
    actions: {
      setAnswer,
      uploadDocuments,
      next: () => void advance(state.session),
      back,
      restart,
      beginAudit,
      startQuickBooks,
      retryReport: () => void requestReport(state.session, state.quickBooks, true),
      signInToPorter,
      cancelRecovery,
      startRecoveryEmail,
      verifyRecoveryEmail,
    },
  };
}
