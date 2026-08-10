import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import posthog from "posthog-js";
import { Seo } from "../components/Seo";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import {
  createFinancialHealthAudit,
  generateFinancialHealthAudit,
  generateFinancialHealthAuditDeepReview,
  getFinancialHealthQuickBooksConnection,
  listFinancialHealthAuditDocuments,
  startFinancialHealthQuickBooksConnection,
  uploadFinancialHealthAuditDocument,
  updateFinancialHealthAudit,
  type AuditDocument,
} from "../services/financialHealthAudit";
import {
  FLOWS,
  SHARED_FLOW,
  STEPS,
  canContinue,
  fieldIsVisible,
  type AnswerValue,
  type AuditAnswers,
  type AuditField,
  type AuditPath,
  type AuditReport,
  type AuditStep,
  type Finding,
  type InsightFinding,
} from "./financialHealthAuditFlow";
import "./FinancialHealthAudit.css";

type ContextMode = "url" | "describe";

type AuditState = {
  stepId: string;
  path: AuditPath | null;
  answers: AuditAnswers;
  contextMode: ContextMode;
  auditId: string | null;
  auditToken: string | null;
  report: AuditReport | null;
};

type ReportPhase = "idle" | "generating" | "error";
type DeepReviewPhase = "idle" | "generating" | "error";
type QuickBooksPhase = "idle" | "connecting" | "checking" | "error";

const STORAGE_KEY = "porter-financial-health-audit-v1";
const QUICKBOOKS_STARTED_AT_KEY = "porter-financial-health-audit-qbo-started-at";

const INITIAL_STATE: AuditState = {
  stepId: "business-type",
  path: null,
  answers: {},
  contextMode: "url",
  auditId: null,
  auditToken: null,
  report: null,
};

function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  posthog.capture(event, properties);
}

function quickBooksAuthorizationDuration(): number | null {
  const raw = window.sessionStorage.getItem(QUICKBOOKS_STARTED_AT_KEY);
  window.sessionStorage.removeItem(QUICKBOOKS_STARTED_AT_KEY);
  if (!raw) return null;
  const startedAt = Number(raw);
  return Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : null;
}

function isAuditState(value: unknown): value is AuditState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditState>;
  return (
    typeof candidate.stepId === "string" &&
    candidate.stepId in STEPS &&
    (candidate.path === null || candidate.path === "connected" || candidate.path === "documents" || candidate.path === "unconnected") &&
    Boolean(candidate.answers && typeof candidate.answers === "object") &&
    (candidate.contextMode === "url" || candidate.contextMode === "describe") &&
    (candidate.auditId === undefined || candidate.auditId === null || typeof candidate.auditId === "string") &&
    (candidate.auditToken === undefined || candidate.auditToken === null || typeof candidate.auditToken === "string") &&
    (candidate.report === undefined || candidate.report === null || isAuditReport(candidate.report))
  );
}

function isAuditReport(value: unknown): value is AuditReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditReport>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.lede === "string" &&
    (candidate.analysisSummary === undefined || typeof candidate.analysisSummary === "string") &&
    Array.isArray(candidate.findings) &&
    (candidate.deepFindings === undefined || Array.isArray(candidate.deepFindings)) &&
    Array.isArray(candidate.actions) &&
    typeof candidate.confidenceTitle === "string" &&
    typeof candidate.confidenceBody === "string"
  );
}

function advancesOnChoice(step: AuditStep): boolean {
  // The audit-method cards are actions: each one starts its chosen path.
  // Every questionnaire choice remains editable until Continue is clicked.
  return step.id === "connect";
}

export function FinancialHealthAudit() {
  return (
    <WaitlistProvider>
      <div className="fha-shell">
        <a className="fha-home-link" href="/" aria-label="Porter home">
          <img src="/porter-logo-dark.svg" alt="Porter" />
        </a>
        <Seo
          title="Free Financial Health Audit | Porter"
          description="A guided financial health checkup for small businesses, covering cash, profit, unpaid invoices, and the quality of your books."
          path="/financial-health-audit"
          jsonLd={{
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Porter Financial Health Audit",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: "https://buildwithporter.com/financial-health-audit",
            description: "A guided financial health audit for small-business owners.",
          }}
        />
        <AuditExperience />
      </div>
    </WaitlistProvider>
  );
}

function AuditExperience() {
  const [state, setState] = useState<AuditState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [reportPhase, setReportPhase] = useState<ReportPhase>("idle");
  const [deepReviewPhase, setDeepReviewPhase] = useState<DeepReviewPhase>("idle");
  const [reportError, setReportError] = useState("");
  const [quickBooksPhase, setQuickBooksPhase] = useState<QuickBooksPhase>("idle");
  const [quickBooksError, setQuickBooksError] = useState("");
  const [documents, setDocuments] = useState<AuditDocument[]>([]);
  const [documentError, setDocumentError] = useState("");
  const [documentUploadActive, setDocumentUploadActive] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const auditIdRef = useRef<string | null>(null);
  const auditTokenRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const backgroundSaveTimerRef = useRef<number | null>(null);
  const quickBooksIntentRef = useRef(false);
  const quickBooksNavigationRef = useRef(false);
  const deepReviewRequestedRef = useRef(false);
  const stepEnteredAtRef = useRef(0);
  const { open: openWaitlist } = useWaitlist();

  useEffect(() => {
    let restored: AuditState | null = null;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === "object" &&
          "stepId" in parsed &&
          parsed.stepId === "quickbooks-access"
        ) {
          parsed.stepId = "connect";
          if ("path" in parsed) parsed.path = null;
        }
        if (isAuditState(parsed)) {
          restored = {
            ...INITIAL_STATE,
            ...parsed,
            auditId: parsed.auditId ?? null,
            auditToken: parsed.auditToken ?? null,
            report: parsed.report ?? null,
          };
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    const timer = window.setTimeout(() => {
      if (restored) {
        auditIdRef.current = restored.auditId;
        auditTokenRef.current = restored.auditToken;
        quickBooksIntentRef.current =
          restored.path === "connected" &&
          restored.answers.connection_choice === "quickbooks";
        setState(restored);
        if (STEPS[restored.stepId].kind === "report" && !restored.report) {
          setReportPhase("error");
          setReportError("Your report was interrupted. Generate it again to continue.");
        }
      }
      setHydrated(true);
    }, 0);
    track("financial_health_audit_viewed");
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const callbackStatus = params.get("quickbooks");
      if (!callbackStatus) return;

      const clearCallbackQuery = () => {
        params.delete("quickbooks");
        params.delete("audit_id");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
      };

      if (callbackStatus !== "connected") {
        quickBooksIntentRef.current = false;
        quickBooksNavigationRef.current = false;
        setQuickBooksPhase("error");
        setQuickBooksError("QuickBooks was not connected. Try again or continue without it.");
        setState((current) => ({ ...current, path: null, stepId: "connect" }));
        clearCallbackQuery();
        track("financial_health_audit_quickbooks_failed", {
          authorization_duration_ms: quickBooksAuthorizationDuration(),
        });
        return;
      }

      const auditId = auditIdRef.current;
      const auditToken = auditTokenRef.current;
      if (!auditId || !auditToken) {
        quickBooksIntentRef.current = false;
        quickBooksNavigationRef.current = false;
        setQuickBooksPhase("error");
        setQuickBooksError("This QuickBooks return could not be matched to your audit. Start again.");
        clearCallbackQuery();
        return;
      }

      setQuickBooksPhase("checking");
      void getFinancialHealthQuickBooksConnection(auditId, auditToken)
        .then((connection) => {
          if (connection.status !== "connected") {
            throw new Error("QuickBooks did not finish connecting.");
          }
          quickBooksIntentRef.current = true;
          quickBooksNavigationRef.current = false;
          setState((current) => ({ ...current, path: "connected", stepId: "goal" }));
          setQuickBooksPhase("idle");
          setQuickBooksError("");
          track("financial_health_audit_quickbooks_connected", {
            authorization_duration_ms: quickBooksAuthorizationDuration(),
          });
        })
        .catch((error) => {
          quickBooksIntentRef.current = false;
          quickBooksNavigationRef.current = false;
          setState((current) => ({ ...current, path: null, stepId: "connect" }));
          setQuickBooksPhase("error");
          setQuickBooksError(
            error instanceof Error ? error.message : "QuickBooks did not finish connecting.",
          );
        })
        .finally(clearCallbackQuery);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const enqueueSave = useCallback((snapshot: AuditState): Promise<{ id: string; token: string }> => {
    let credential = { id: "", token: "" };
    const task = saveQueueRef.current.then(async () => {
      // Once OAuth has been requested, connection intent is monotonic. A save
      // captured by an older render must never clear it while the browser is
      // leaving for Intuit or after it returns successfully.
      const persistableSnapshot = quickBooksIntentRef.current
        ? {
            ...snapshot,
            path: "connected" as const,
            answers: { ...snapshot.answers, connection_choice: "quickbooks" },
          }
        : snapshot;
      const payload = {
        stepId: persistableSnapshot.stepId,
        path: persistableSnapshot.path,
        answers: persistableSnapshot.answers,
      };
      const remote = auditIdRef.current && auditTokenRef.current
        ? await updateFinancialHealthAudit(auditIdRef.current, auditTokenRef.current, payload)
        : await createFinancialHealthAudit(payload);
      const auditToken = remote.accessToken ?? auditTokenRef.current;
      if (!auditToken) throw new Error("Porter did not return an audit access token.");
      credential = { id: remote.id, token: auditToken };
      auditIdRef.current = remote.id;
      auditTokenRef.current = auditToken;
      setState((current) =>
        current.auditId === remote.id && current.auditToken === auditToken
          ? current
          : { ...current, auditId: remote.id, auditToken },
      );
    });
    saveQueueRef.current = task.catch(() => undefined);
    return task.then(() => credential);
  }, []);

  const refreshDocuments = useCallback(async () => {
    const auditId = auditIdRef.current;
    const auditToken = auditTokenRef.current;
    if (!auditId || !auditToken) return;
    try {
      setDocuments(await listFinancialHealthAuditDocuments(auditId, auditToken));
      setDocumentError("");
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "We could not check your uploaded files.");
    }
  }, []);

  useEffect(() => {
    if (!hydrated || state.path !== "documents" || !state.auditId || !state.auditToken) return;
    void refreshDocuments();
  }, [hydrated, refreshDocuments, state.auditId, state.auditToken, state.path]);

  useEffect(() => {
    if (!hydrated || state.path !== "documents" || !state.auditId || !state.auditToken) return;
    if (!documents.some((document) => document.status === "uploading" || document.status === "processing")) return;
    // Reason: Extraction continues after the visitor leaves the upload screen.
    // Keep the sidebar status current throughout the document-backed flow.
    const timer = window.setInterval(() => void refreshDocuments(), 2_000);
    return () => window.clearInterval(timer);
  }, [documents, hydrated, refreshDocuments, state.auditId, state.auditToken, state.path]);

  useEffect(() => {
    if (
      !hydrated ||
      state.report ||
      STEPS[state.stepId].kind === "report" ||
      Object.keys(state.answers).length === 0 ||
      quickBooksNavigationRef.current
    ) return;
    backgroundSaveTimerRef.current = window.setTimeout(() => {
      backgroundSaveTimerRef.current = null;
      if (quickBooksNavigationRef.current) return;
      void enqueueSave(state).catch(() => {
        // Background capture is retried by the next answer and is made blocking
        // only when the visitor asks Porter to generate the report.
      });
    }, 500);
    return () => {
      if (backgroundSaveTimerRef.current !== null) {
        window.clearTimeout(backgroundSaveTimerRef.current);
        backgroundSaveTimerRef.current = null;
      }
    };
  }, [enqueueSave, hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    stepEnteredAtRef.current = Date.now();
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    track("financial_health_audit_step_viewed", {
      step_id: state.stepId,
      path: state.path ?? "shared",
    });
  }, [hydrated, state.path, state.stepId]);

  const step = STEPS[state.stepId];
  const flow = state.path ? FLOWS[state.path] : SHARED_FLOW;
  const stepIndex = Math.max(0, flow.indexOf(state.stepId));
  const questionSteps = flow.filter((id) => STEPS[id].kind !== "report");
  const report = step.kind === "report" ? state.report : null;
  const choiceAdvancesImmediately = advancesOnChoice(step);

  const setAnswer = (name: string, value: AnswerValue) => {
    const nextState: AuditState = {
      ...state,
      path: name === "connection_choice" && (value === "questions" || value === "skip" || value === "documents") ? null : state.path,
      answers: { ...state.answers, [name]: value },
    };
    setState(nextState);
    if (name === "connection_choice" && (value === "questions" || value === "skip" || value === "documents")) {
      quickBooksIntentRef.current = false;
      quickBooksNavigationRef.current = false;
      setQuickBooksPhase("idle");
      setQuickBooksError("");
    }
    setValidationMessage("");
    if (choiceAdvancesImmediately) advance(nextState);
  };

  const uploadDocuments = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length || documentUploadActive) return;
    setDocumentUploadActive(true);
    setDocumentError("");
    try {
      // Reason: A visitor may reach this screen before autosave fires. Creating
      // the audit synchronously makes every direct-upload target bind to the
      // same bearer-protected audit rather than a browser-only placeholder.
      const credential = await enqueueSave({ ...state, path: "documents", stepId: "document-upload" });
      const settled = await Promise.allSettled(
        selectedFiles.map((file) => uploadFinancialHealthAuditDocument(credential.id, credential.token, file)),
      );
      const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      await refreshDocuments();
      if (failures.length) {
        // Reason: A successful document-list refresh must not hide a failed
        // direct upload. Surface the file failure after refreshing statuses so
        // the visitor can retry with a clear explanation.
        setDocumentError(
          failures.length === 1
            ? (failures[0].reason instanceof Error ? failures[0].reason.message : "One file could not be uploaded.")
            : `${failures.length} files could not be uploaded. Try them again.`,
        );
      }
      track("financial_health_audit_documents_uploaded", {
        document_count: selectedFiles.length - failures.length,
      });
    } finally {
      setDocumentUploadActive(false);
    }
  };

  const requestReport = async (snapshot: AuditState) => {
    const startedAt = Date.now();
    setReportPhase("generating");
    setReportError("");
    try {
      const credential = await enqueueSave(snapshot);
      const remote = await generateFinancialHealthAudit(credential.id, credential.token);
      if (!remote.report) throw new Error("Porter did not return a report.");
      setState((current) => ({ ...current, auditId: remote.id, report: remote.report }));
      setReportPhase("idle");
      track("financial_health_audit_report_generated", {
        path: snapshot.path ?? "unknown",
        duration_ms: Date.now() - startedAt,
      });
    } catch (error) {
      setReportPhase("error");
      setReportError(
        error instanceof Error
          ? error.message
          : "The report could not be generated. Try again.",
      );
      track("financial_health_audit_report_failed", {
        path: snapshot.path ?? "unknown",
        duration_ms: Date.now() - startedAt,
      });
    }
  };

  const requestDeepReview = useCallback(async () => {
    const auditId = auditIdRef.current;
    const auditToken = auditTokenRef.current;
    if (!auditId || !auditToken || deepReviewRequestedRef.current) return;
    deepReviewRequestedRef.current = true;
    setDeepReviewPhase("generating");
    try {
      const remote = await generateFinancialHealthAuditDeepReview(auditId, auditToken);
      if (!remote.report) throw new Error("Porter did not return the deeper review.");
      setState((current) => ({ ...current, report: remote.report }));
      setDeepReviewPhase("idle");
      track("financial_health_audit_deep_review_generated", {
        path: state.path ?? "unknown",
      });
    } catch {
      // Reason: The useful three-check report remains complete even when this
      // background pass fails. Let the visitor retry the deeper review without
      // discarding the audit or resubmitting their email.
      deepReviewRequestedRef.current = false;
      setDeepReviewPhase("error");
    }
  }, [state.path]);

  useEffect(() => {
    if (
      !hydrated ||
      !state.report ||
      state.report.deepFindings?.length ||
      STEPS[state.stepId].kind !== "report"
    ) return;
    // Reason: Start the second bounded pass only after the free report is on
    // screen. The visitor can read and submit the email form while it runs.
    void requestDeepReview();
  }, [hydrated, requestDeepReview, state.report, state.stepId]);

  const connectQuickBooks = async (snapshot: AuditState = state) => {
    setQuickBooksError("");
    let authorizationIssued = false;
    try {
      const credential = await enqueueSave(snapshot);
      const persistedState = {
        ...snapshot,
        auditId: credential.id,
        auditToken: credential.token,
      };
      // Persist synchronously before leaving the site so the Intuit callback can
      // prove which browser session owns the connected audit.
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
      const connection = await startFinancialHealthQuickBooksConnection(
        credential.id,
        credential.token,
      );
      authorizationIssued = true;
      window.sessionStorage.setItem(QUICKBOOKS_STARTED_AT_KEY, String(Date.now()));
      track("financial_health_audit_quickbooks_authorization_started", {
        step_duration_ms: Date.now() - stepEnteredAtRef.current,
      });
      window.location.assign(connection.authUrl);
    } catch (error) {
      quickBooksNavigationRef.current = false;
      if (!authorizationIssued) quickBooksIntentRef.current = false;
      setQuickBooksPhase("error");
      setQuickBooksError(
        error instanceof Error
          ? error.message
          : "QuickBooks could not be opened. Try again or continue without it.",
      );
      track("financial_health_audit_quickbooks_failed");
    }
  };

  const startQuickBooksFromChoice = () => {
    if (quickBooksNavigationRef.current) return;
    const snapshot: AuditState = {
      ...state,
      path: "connected",
      stepId: "connect",
      report: null,
      answers: { ...state.answers, connection_choice: "quickbooks" },
    };
    // Stop the debounced save captured by the previous render before it can be
    // appended behind the OAuth-intent save.
    quickBooksIntentRef.current = true;
    quickBooksNavigationRef.current = true;
    if (backgroundSaveTimerRef.current !== null) {
      window.clearTimeout(backgroundSaveTimerRef.current);
      backgroundSaveTimerRef.current = null;
    }
    setValidationMessage("");
    track("financial_health_audit_step_completed", {
      step_id: "connect",
      path: "connected",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });
    track("financial_health_audit_connection_selected", { selection: "uses_quickbooks" });
    void connectQuickBooks(snapshot);
  };

  function advance(snapshot: AuditState) {
    if (!canContinue(step, snapshot.answers)) {
      setValidationMessage("Choose an answer to continue.");
      return;
    }

    track("financial_health_audit_step_completed", {
      step_id: step.id,
      path: snapshot.path ?? "shared",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });

    if (step.id === "business-type") track("financial_health_audit_started");

    if (step.id === "connect") {
      if (snapshot.answers.connection_choice === "quickbooks") return;
      if (snapshot.answers.connection_choice === "documents") {
        track("financial_health_audit_connection_selected", { selection: "uploaded_documents" });
        setState({ ...snapshot, path: "documents", stepId: "document-upload" });
        return;
      }
      track("financial_health_audit_connection_selected", { selection: "questions" });
      setState({ ...snapshot, path: "unconnected", stepId: "context" });
      return;
    }

    if (step.kind === "documents") {
      const readyDocuments = documents.filter((document) => document.status === "ready");
      const processingDocuments = documents.some((document) => document.status === "processing");
      const uploadingDocuments = documentUploadActive || documents.some((document) => document.status === "uploading");
      if (!readyDocuments.length && !processingDocuments) {
        setValidationMessage(
          uploadingDocuments
            ? "Your files are still uploading. Continue once Porter starts reading them."
            : "Upload at least one financial file for a document-backed audit.",
        );
        return;
      }
      // Reason: Let the visitor answer the owner-context questions while Porter
      // reads the files. The report boundary below still waits for every file.
      const activeFlow = FLOWS.documents;
      const nextId = activeFlow[activeFlow.indexOf(snapshot.stepId) + 1];
      if (!nextId) return;
      const nextState = { ...snapshot, stepId: nextId, report: null };
      setState(nextState);
      if (STEPS[nextId].kind === "report") void requestReport(nextState);
      return;
    }

    const activeFlow = snapshot.path ? FLOWS[snapshot.path] : SHARED_FLOW;
    const index = activeFlow.indexOf(snapshot.stepId);
    const nextId = activeFlow[index + 1];
    if (!nextId) return;
    if (snapshot.path === "documents" && STEPS[nextId].kind === "report") {
      const readyDocuments = documents.filter((document) => document.status === "ready");
      const inFlightDocuments = documents.filter(
        (document) => document.status === "uploading" || document.status === "processing",
      );
      if (!readyDocuments.length || inFlightDocuments.length) {
        setValidationMessage(
          inFlightDocuments.length
            ? `Porter is still reading ${inFlightDocuments.length} ${inFlightDocuments.length === 1 ? "file" : "files"}. Your report will include them as soon as they are ready.`
            : "At least one document needs to be ready before Porter can generate your report.",
        );
        return;
      }
    }
    const nextState = { ...snapshot, stepId: nextId, report: null };
    setState(nextState);
    if (STEPS[nextId].kind === "report") {
      void requestReport(nextState);
    }
  }

  const next = () => advance(state);

  const back = () => {
    const activeFlow = state.path ? FLOWS[state.path] : SHARED_FLOW;
    const index = activeFlow.indexOf(state.stepId);
    if (index <= 0) return;
    const previousId = activeFlow[index - 1];
    setState((current) => ({ ...current, stepId: previousId }));
    setValidationMessage("");
  };

  const restart = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    auditIdRef.current = null;
    auditTokenRef.current = null;
    saveQueueRef.current = Promise.resolve();
    if (backgroundSaveTimerRef.current !== null) {
      window.clearTimeout(backgroundSaveTimerRef.current);
      backgroundSaveTimerRef.current = null;
    }
    quickBooksIntentRef.current = false;
    quickBooksNavigationRef.current = false;
    setState(INITIAL_STATE);
    setReportPhase("idle");
    setReportError("");
    setQuickBooksPhase("idle");
    setQuickBooksError("");
    setValidationMessage("");
    track("financial_health_audit_restarted");
  };

  const openCta = () => {
    track("financial_health_audit_cta_clicked", { path: state.path ?? "unknown" });
    openWaitlist();
  };

  return (
    <main className="fha-main">
      {report ? (
          <ReportView
          report={report}
          path={state.path}
          answers={state.answers}
          onRestart={restart}
          onCta={openCta}
            titleRef={titleRef}
            deepReviewPhase={deepReviewPhase}
            onRetryDeepReview={requestDeepReview}
          />
      ) : step.kind === "report" ? (
        <ReportPendingView
          phase={reportPhase}
          error={reportError}
          onRetry={() => void requestReport(state)}
          onBack={back}
          titleRef={titleRef}
        />
      ) : (
        <div className={`fha-stage ${step.aside === "intro" ? "fha-stage--solo" : ""}`}>
          <section
            className="fha-card"
            aria-describedby={step.id === "connect" ? "fha-quickbooks-status fha-validation" : "fha-validation"}
          >
            <ProgressRail flow={questionSteps} currentId={step.id} />
              <div className="fha-card__head">
              <p className="fha-mobile-progress">
                Question {Math.min(stepIndex + 1, questionSteps.length)} of {questionSteps.length}
              </p>
              <h1 ref={titleRef} tabIndex={-1}>{step.title}</h1>
              {step.subtitle ? <p>{step.subtitle}</p> : null}
            </div>

            <div className="fha-card__body">
              {step.kind === "context" ? (
                <ContextField state={state} setState={setState} setAnswer={setAnswer} />
              ) : step.kind === "documents" ? (
                <DocumentUploadField
                  documents={documents}
                  error={documentError}
                  uploading={documentUploadActive}
                  onFiles={uploadDocuments}
                />
              ) : (
                step.fields?.map((field) => (
                  <AuditFieldControl
                    key={field.name}
                    field={field}
                    answers={state.answers}
                    onChange={setAnswer}
                    onQuickBooks={step.id === "connect" ? startQuickBooksFromChoice : undefined}
                    quickBooksPhase={step.id === "connect" ? quickBooksPhase : undefined}
                    quickBooksError={step.id === "connect" ? quickBooksError : undefined}
                  />
                ))
              )}
            </div>

            <div className="fha-card__foot">
              <div>
                {step.id !== "business-type" ? (
                  <button type="button" className="fha-button fha-button--quiet" onClick={back}>Back</button>
                ) : <span />}
              </div>
              <div className="fha-card__advance">
                <>
                  <p id="fha-validation" className="fha-validation" aria-live="polite">{validationMessage}</p>
                  {!choiceAdvancesImmediately && (step.id !== "connect" || state.answers.connection_choice === "questions" || state.answers.connection_choice === "skip" || state.answers.connection_choice === "documents") ? (
                    <button type="button" className="fha-button fha-button--primary" onClick={next}>
                      {step.id === "connect"
                        ? state.answers.connection_choice === "documents"
                          ? "Upload documents"
                          : "Answer a few questions"
                        : STEPS[flow[stepIndex + 1]]?.kind === "report"
                          ? "See my report"
                          : "Continue"}
                      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                    </button>
                  ) : null}
                </>
              </div>
            </div>
          </section>

          <AuditAside
            step={step}
            questionsLeft={Math.max(0, questionSteps.length - stepIndex - 1)}
            onConnect={startQuickBooksFromChoice}
            documents={documents}
            showDocumentProgress={state.path === "documents"}
          />
        </div>
      )}

      {state.stepId !== "business-type" && step.kind !== "report" ? (
        <button type="button" className="fha-restart" onClick={restart}>
          <span className="material-symbols-outlined" aria-hidden="true">restart_alt</span>
          Restart audit
        </button>
      ) : null}

    </main>
  );
}

function ReportPendingView({
  phase,
  error,
  onRetry,
  onBack,
  titleRef,
}: {
  phase: ReportPhase;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const loading = phase !== "error";
  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-report-pending" aria-live="polite">
        <div className="fha-card__head">
          <p className="fha-kicker">Financial health audit</p>
          <h1 ref={titleRef} tabIndex={-1}>
            {loading ? "Reviewing your answers." : "Your report did not finish."}
          </h1>
          <p>{loading ? "Porter is identifying the three signals worth your attention." : error}</p>
        </div>
        {loading ? (
          <div className="fha-card__body" aria-hidden="true">
            <div className="fha-scan-lines fha-scan-lines--report">
              <span /><span /><span /><span />
            </div>
          </div>
        ) : null}
        <div className="fha-card__foot">
          {!loading ? (
            <button type="button" className="fha-button fha-button--quiet" onClick={onBack}>
              Back
            </button>
          ) : <span />}
          {!loading ? (
            <button type="button" className="fha-button fha-button--primary" onClick={onRetry}>
              Generate report
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProgressRail({ flow, currentId }: { flow: string[]; currentId: string }) {
  const currentIndex = flow.indexOf(currentId);
  return (
    <ol className="fha-rail" aria-label="Audit progress">
      {flow.map((id, index) => {
        const current = id === currentId;
        const done = currentIndex > index;
        return (
          <li key={id} className={`${current ? "is-current" : ""} ${done ? "is-done" : ""}`} aria-current={current ? "step" : undefined}>
            <span>{done ? <span className="material-symbols-outlined" aria-hidden="true">check</span> : index + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

function AuditFieldControl({
  field,
  answers,
  onChange,
  onQuickBooks,
  quickBooksPhase,
  quickBooksError,
}: {
  field: AuditField;
  answers: AuditAnswers;
  onChange: (name: string, value: AnswerValue) => void;
  onQuickBooks?: () => void;
  quickBooksPhase?: QuickBooksPhase;
  quickBooksError?: string;
}) {
  if (!fieldIsVisible(field, answers)) return null;
  if (field.type === "connect") {
    return (
      <ConnectChoice
        value={answers[field.name]}
        onChange={(value) => onChange(field.name, value)}
        onQuickBooks={onQuickBooks}
        phase={quickBooksPhase}
        error={quickBooksError}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="fha-field">
        <span className="fha-field__label">{field.label}</span>
        <textarea
          value={typeof answers[field.name] === "string" ? answers[field.name] : ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      </label>
    );
  }

  const selected = answers[field.name];
  const multi = field.type === "multi";
  const selectedValues = Array.isArray(selected) ? selected : [];

  return (
    <fieldset className="fha-field">
      <legend className={`fha-field__label ${field.hideLabel ? "fha-visually-hidden" : ""}`}>{field.label}</legend>
      <div className={field.type === "tiles" ? "fha-tiles" : "fha-chips"}>
        {field.options?.map((option) => {
          const active = multi ? selectedValues.includes(option.label) : selected === option.label;
          return (
            <button
              key={option.label}
              type="button"
              className={`${field.type === "tiles" ? "fha-tile" : "fha-chip"} ${active ? "is-selected" : ""}`}
              aria-pressed={active}
              onClick={() => {
                if (!multi) {
                  onChange(field.name, option.label);
                  return;
                }
                onChange(
                  field.name,
                  active ? selectedValues.filter((value) => value !== option.label) : [...selectedValues, option.label],
                );
              }}
            >
              {option.icon ? <span className="material-symbols-outlined" aria-hidden="true">{option.icon}</span> : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {field.note ? (
        <p className="fha-guess-note">
          <span className="material-symbols-outlined" aria-hidden="true">compare_arrows</span>
          {field.note}
        </p>
      ) : null}
    </fieldset>
  );
}

function ConnectChoice({
  value,
  onChange,
  onQuickBooks,
  phase = "idle",
  error = "",
}: {
  value: AnswerValue | undefined;
  onChange: (value: string) => void;
  onQuickBooks?: () => void;
  phase?: QuickBooksPhase;
  error?: string;
}) {
  const opening = phase === "connecting" || phase === "checking";
  return (
    <fieldset className="fha-field">
      <legend className="fha-field__label fha-visually-hidden">Connection choice</legend>
      <div className="fha-connect-grid">
        <button
          type="button"
          className={`fha-connect-card ${value === "quickbooks" ? "is-selected" : ""}`}
          aria-pressed={value === "quickbooks"}
          onClick={() => (onQuickBooks ? onQuickBooks() : onChange("quickbooks"))}
          disabled={opening}
        >
          <span className="fha-qb">qb</span>
          <strong>{opening ? "Opening QuickBooks…" : "I use QuickBooks"}</strong>
          <small>Connect for a books-backed checkup.</small>
        </button>
        <button
          type="button"
          className={`fha-connect-card ${value === "documents" ? "is-selected" : ""}`}
          aria-pressed={value === "documents"}
          onClick={() => onChange("documents")}
          disabled={opening}
        >
          <span className="material-symbols-outlined fha-connect-icon" aria-hidden="true">upload_file</span>
          <strong>Upload financial documents</strong>
          <small>Drop in the reports and statements you already have.</small>
        </button>
        <button
          type="button"
          className={`fha-connect-card ${value === "questions" || value === "skip" ? "is-selected" : ""}`}
          aria-pressed={value === "questions" || value === "skip"}
          onClick={() => onChange("questions")}
          disabled={opening}
        >
          <span className="material-symbols-outlined fha-connect-icon" aria-hidden="true">chat</span>
          <strong>Answer a few questions</strong>
          <small>Get a quick, directional checkup without sharing files.</small>
        </button>
      </div>
      <p className="fha-data-use-note">
        Your financial data is used to prepare this audit. We’ll use it for personalized follow-up only if you choose to opt in.
      </p>
      <p
        id="fha-quickbooks-status"
        className={`fha-connect-status ${error ? "is-error" : ""}`}
        aria-live="polite"
      >
        {error || (opening ? "Opening QuickBooks…" : "")}
      </p>
    </fieldset>
  );
}

function ContextField({
  state,
  setState,
  setAnswer,
}: {
  state: AuditState;
  setState: React.Dispatch<React.SetStateAction<AuditState>>;
  setAnswer: (name: string, value: AnswerValue) => void;
}) {
  const isUrl = state.contextMode === "url";
  const fieldName = isUrl ? "website_url" : "business_description";
  const value = typeof state.answers[fieldName] === "string" ? state.answers[fieldName] : "";
  return (
    <div className="fha-context">
      <label className="fha-field">
        <span className="fha-field__label">{isUrl ? "Business website" : "What does your business do?"}</span>
        {isUrl ? (
          <input
            type="url"
            value={value}
            placeholder="https://"
            onChange={(event) => setAnswer(fieldName, event.target.value)}
          />
        ) : (
          <textarea
            value={value}
            placeholder="One or two sentences is plenty."
            onChange={(event) => setAnswer(fieldName, event.target.value)}
          />
        )}
      </label>
      <button
        type="button"
        className="fha-text-link"
        onClick={() => setState((current) => ({ ...current, contextMode: isUrl ? "describe" : "url" }))}
      >
        {isUrl ? "I would rather just describe it" : "Actually, I have a website"}
      </button>
      <p className="fha-context__optional">Optional. Used only to tailor the findings.</p>
    </div>
  );
}

function DocumentUploadField({
  documents,
  error,
  uploading,
  onFiles,
}: {
  documents: AuditDocument[];
  error: string;
  uploading: boolean;
  onFiles: (files: FileList | File[]) => void;
}) {
  const processing = documents.some(
    (document) => document.status === "uploading" || document.status === "processing",
  );
  return (
    <div className="fha-documents">
      <div className="fha-document-guidance" aria-label="Most useful financial documents">
        <p className="fha-document-guidance__label">Most useful files</p>
        <div className="fha-document-guidance__grid">
          {[
            { icon: "insert_chart", label: "Profit & loss" },
            { icon: "account_balance", label: "Balance sheet" },
            { icon: "credit_card", label: "Bank or card statements" },
            { icon: "schedule", label: "A/R or A/P aging" },
          ].map((item) => (
            <div className="fha-document-guidance__item" key={item.label}>
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <label
        className={`fha-document-dropzone ${uploading ? "is-uploading" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!uploading && event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.tsv,.txt,.md,.docx,.xlsx,.xls,.xlsm,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
          disabled={uploading}
          onChange={(event) => {
            if (event.currentTarget.files?.length) onFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
        <strong>{uploading ? "Uploading your files…" : "Drop files here, or choose files"}</strong>
        <small>PDF, spreadsheet, Word, image, or text file. Up to 50MB each.</small>
      </label>
      <p className="fha-document-hint">
        Upload what you have. One useful file is enough to continue.
      </p>
      {documents.length ? (
        <ul className="fha-document-list" aria-live="polite">
          {documents.map((document) => (
            <li key={document.id}>
              <span className="material-symbols-outlined" aria-hidden="true">description</span>
              <span className="fha-document-list__name">{document.filename}</span>
              <span className={`fha-document-list__status is-${document.status}`}>
                {document.status === "ready"
                  ? "Ready"
                  : document.status === "failed"
                    ? "Could not read"
                    : "Reading…"}
              </span>
              {document.errorMessage ? <small>{document.errorMessage}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {processing ? <p className="fha-document-progress">Porter is reading your files. You can add more while it works.</p> : null}
      {error ? <p className="fha-connect-status is-error" aria-live="polite">{error}</p> : null}
    </div>
  );
}

function DocumentReadingProgress({ documents }: { documents: AuditDocument[] }) {
  const total = documents.length;
  const ready = documents.filter((document) => document.status === "ready").length;
  const processing = documents.filter(
    (document) => document.status === "uploading" || document.status === "processing",
  ).length;
  const failed = documents.filter((document) => document.status === "failed").length;
  const percentage = total ? Math.round((ready / total) * 100) : 0;
  const status = [
    processing ? `${processing} being read` : "",
    failed ? `${failed} need attention` : "",
  ].filter(Boolean).join(" · ") || "Ready for your report";

  return (
    <div className="fha-aside-documents">
      <p className="fha-aside-documents__label">
        <span className="material-symbols-outlined" aria-hidden="true">document_scanner</span>
        Documents
      </p>
      <p className="fha-aside-documents__count">
        <strong>{ready}</strong>
        <span>of {total} ready</span>
      </p>
      <div
        className="fha-aside-documents__track"
        role="progressbar"
        aria-label="Documents ready"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ready}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p className="fha-aside-documents__status">{status}</p>
    </div>
  );
}

function AuditAside({
  step,
  questionsLeft,
  onConnect,
  documents,
  showDocumentProgress,
}: {
  step: AuditStep;
  questionsLeft: number;
  onConnect: () => void;
  documents: AuditDocument[];
  showDocumentProgress: boolean;
}) {
  const documentProgress = showDocumentProgress && documents.length
    ? <DocumentReadingProgress documents={documents} />
    : null;

  if (step.aside === "scan") {
    return (
      <aside className="fha-aside" aria-live="polite">
        <p className="fha-aside__eyebrow"><span className="fha-scan-dot" />Reviewing your answers</p>
        <div className="fha-scan-lines" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        {documentProgress}
      </aside>
    );
  }
  if (step.aside === "counter") {
    return (
      <aside className="fha-aside">
        <strong className="fha-counter">{questionsLeft}</strong>
        <span className="fha-counter__label">question{questionsLeft === 1 ? "" : "s"} to go</span>
        <button type="button" className="fha-aside__connect" onClick={onConnect}>
          <span className="fha-qb fha-qb--small">qb</span>
          I use QuickBooks
        </button>
        {documentProgress}
      </aside>
    );
  }
  return null;
}

function ReportView({
  report,
  path,
  answers,
  onRestart,
  onCta,
  titleRef,
  deepReviewPhase,
  onRetryDeepReview,
}: {
  report: AuditReport;
  path: AuditPath | null;
  answers: AuditAnswers;
  onRestart: () => void;
  onCta: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  deepReviewPhase: DeepReviewPhase;
  onRetryDeepReview: () => Promise<void>;
}) {
  const metrics = getReportMetrics(report, path, answers);
  const [insightsUnlocked, setInsightsUnlocked] = useState(false);
  const [insightEmail, setInsightEmail] = useState("");
  const [insightEmailStatus, setInsightEmailStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [personalizedEmailStatus, setPersonalizedEmailStatus] = useState<"idle" | "submitting" | "subscribed" | "error">("idle");
  // Reason: The audit used to generate three findings but hide two of them,
  // which made the free result feel like a teaser instead of a useful review.
  // Show the complete three-check diagnosis first and reserve genuinely
  // additional conclusions for the email exchange.
  const coreFindings = report.findings.slice(0, 3);
  const deepFindings = report.deepFindings ?? [];
  const analysisSummary = report.analysisSummary?.trim() || report.lede;
  const headline = conciseReportHeadline(report.lede);

  const unlockInsights = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setInsightEmailStatus("submitting");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: insightEmail,
          source: "financial_health_audit",
          action: "unlock_insights",
        }),
      });
      if (!response.ok) throw new Error("Email capture failed");
      setInsightsUnlocked(true);
      setInsightEmailStatus("idle");
      track("financial_health_audit_insights_unlocked", { path: path ?? "unknown" });
    } catch {
      setInsightEmailStatus("error");
    }
  };

  const optInToPersonalizedEmails = async () => {
    if (!insightEmail || personalizedEmailStatus === "submitting") return;

    setPersonalizedEmailStatus("submitting");
    try {
      // Reason: Entering an email to reveal the deeper review is not consent
      // to future outreach. Record this second, affirmative action separately
      // so Porter can distinguish report access from personalized-email opt-in.
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: insightEmail,
          source: "financial_health_audit",
          action: "personalized_insights_opt_in",
        }),
      });
      if (!response.ok) throw new Error("Personalized insights opt-in failed");
      setPersonalizedEmailStatus("subscribed");
      track("financial_health_audit_personalized_insights_opted_in", { path: path ?? "unknown" });
    } catch {
      setPersonalizedEmailStatus("error");
    }
  };

  return (
    <div className="fha-report-wrap">
      <article className="fha-report">
        <header className="fha-report__head">
          <h1 ref={titleRef} tabIndex={-1}>{renderNumericCopy(headline)}</h1>
          <p className="fha-report__reading">{renderNumericCopy(analysisSummary)}</p>
        </header>

        {coreFindings.length ? (
          <section className="fha-report__section fha-report__insights" aria-labelledby="fha-insights-title">
            <h2 id="fha-insights-title">Findings</h2>
            <div className="fha-insight-list">
              {coreFindings.map((finding, index) => {
                const metric = metrics[index];
                return (
                  <article
                    key={`${index}-${findingLabel(finding)}`}
                    className={`fha-insight-row ${findingSentimentClass(finding)}`}
                  >
                    <div className="fha-insight-row__metric">
                      {metric ? <strong>{renderNumericCopy(compactFindingMetric(metric.value))}</strong> : null}
                      {path === "unconnected" ? <small>Based on your answers</small> : null}
                    </div>
                    <div className="fha-insight-row__copy">
                      <h3>{findingLabel(finding)}</h3>
                      <p>{renderNumericCopy(findingNarrative(finding))}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            {deepFindings.length && insightsUnlocked ? (
              <div className="fha-deep-review" aria-live="polite">
                <h2>More things to know</h2>
                <div className="fha-insight-list">
                  {deepFindings.map((finding) => (
                    <article
                      key={`deep-${findingLabel(finding)}`}
                      className={`fha-insight-row ${findingSentimentClass(finding)}`}
                    >
                      <div className="fha-insight-row__metric">
                        <strong>{renderNumericCopy(compactFindingMetric(finding.metric))}</strong>
                      </div>
                      <div className="fha-insight-row__copy">
                        <h3>{findingLabel(finding)}</h3>
                        <p>{renderNumericCopy(finding.narrative)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : insightsUnlocked ? (
              <div className="fha-deep-review-pending" aria-live="polite">
                {deepReviewPhase === "error" ? (
                  <>
                    <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                    <div>
                      <h3>We couldn’t finish the extra checks.</h3>
                      <p>Your main results are ready. Try again without re-entering your email.</p>
                    </div>
                    <button type="button" className="fha-button fha-button--secondary" onClick={() => void onRetryDeepReview()}>
                      Try extra checks again
                    </button>
                  </>
                ) : (
                  <>
                    <span className="fha-deep-review-pending__pulse" aria-hidden="true" />
                    <div>
                      <h3>Porter is checking a few more things.</h3>
                      <p>Keep reading what to do next. The extra details will appear here automatically.</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="fha-insights-gate" aria-live="polite">
                <div className="fha-insights-gate__copy">
                  <div>
                    <h3>Three more findings.</h3>
                    <p>Enter your email to see them.</p>
                  </div>
                </div>
                <form onSubmit={unlockInsights} className="fha-insights-gate__form">
                  <label className="fha-visually-hidden" htmlFor="fha-insight-email">Email address</label>
                  <input
                    id="fha-insight-email"
                    type="email"
                    value={insightEmail}
                    onChange={(event) => setInsightEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                  <button type="submit" className="fha-button fha-button--primary" disabled={insightEmailStatus === "submitting"}>
                    {insightEmailStatus === "submitting" ? "Loading details…" : "Show extra details"}
                  </button>
                </form>
                {insightEmailStatus === "error" ? (
                  <p className="fha-insights-gate__error" role="alert">We couldn’t save your email. Please try again.</p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        <section className="fha-report__section" aria-labelledby="fha-actions-title">
          <h2 id="fha-actions-title">What to do next</h2>
          <ol className="fha-actions">
            {report.actions.map((action) => (
              <li key={action.label} className="fha-action">
                <div>
                  <span className="fha-action__label">{plainLanguageActionLabel(action.label)}</span>
                  <h3>{cleanDisplayCopy(action.title)}</h3>
                  <p>{renderNumericCopy(action.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <details className="fha-report__details">
          <summary>
            <span>How reliable is this report?</span>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
          </summary>
          <div className="fha-report__details-body">
            <h2>{cleanDisplayCopy(report.confidenceTitle)}</h2>
            <p>{cleanDisplayCopy(report.confidenceBody)}</p>
            {report.scopeNote ? <p className="fha-report__scope">{cleanDisplayCopy(report.scopeNote)}</p> : null}
          </div>
        </details>

        {insightsUnlocked ? (
          <section className="fha-follow-up" aria-labelledby="fha-follow-up-title">
            <div className="fha-follow-up__copy">
              <h2 id="fha-follow-up-title">Want Porter to keep helping?</h2>
              <p>Get occasional financial insights personalized to what stood out in this audit. You can unsubscribe anytime.</p>
            </div>
            <div className="fha-follow-up__action" aria-live="polite">
              {personalizedEmailStatus === "subscribed" ? (
                <p className="fha-follow-up__success">You’re signed up for personalized insights.</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="fha-button fha-button--primary"
                    onClick={() => void optInToPersonalizedEmails()}
                    disabled={personalizedEmailStatus === "submitting"}
                  >
                    {personalizedEmailStatus === "submitting" ? "Signing you up…" : "Send me personalized insights"}
                  </button>
                  {personalizedEmailStatus === "error" ? (
                    <p className="fha-follow-up__error" role="alert">We couldn’t save that choice. Please try again.</p>
                  ) : null}
                </>
              )}
            </div>
          </section>
        ) : null}

        <footer className="fha-report__cta">
          <div className="fha-report__cta-copy">
            <h2>Put these numbers to work.</h2>
            <p>Porter keeps your books current and helps you decide what to do next.</p>
          </div>
          <div className="fha-report__cta-actions">
            <button type="button" className="fha-button fha-button--primary fha-button--large" onClick={onCta}>Get ongoing help from Porter</button>
            <button type="button" className="fha-text-link" onClick={onRestart}>Run the audit again</button>
          </div>
        </footer>
      </article>
    </div>
  );
}

type ReportMetric = {
  label: string;
  value: string;
  detail: string;
};

const NUMBER_PATTERN = /\$\s?\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?|\d+(?:\.\d+)?\s?(?:%|pts?|days?|months?|weeks?|years?)|\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?/g;

function getReportMetrics(report: AuditReport, path: AuditPath | null, answers: AuditAnswers): ReportMetric[] {
  const onboardingMetrics = report.findings.filter(isInsightFinding);
  if (onboardingMetrics.length >= 3) {
    // Reason: Porter's onboarding-insights contract makes the grounded metric
    // explicit. Render it directly so connected reports can never fall back to
    // questionnaire estimates merely because model-authored prose omits digits.
    const detail = path === "unconnected" ? "Based on your answers" : "Based on your records";
    return onboardingMetrics.slice(0, 3).map((finding) => ({
      label: finding.label,
      value: finding.metric,
      detail,
    }));
  }

  // Reason: Reports already stored before the structured metric contract used
  // prose-only findings. Keep them readable without treating this compatibility
  // path as the source for newly generated reports.
  const generatedMetrics = report.findings.flatMap((finding) => {
    if (isInsightFinding(finding)) return [];
    const value = finding.fact.match(NUMBER_PATTERN)?.[0];
    if (!value) return [];
    const detail = finding.fact.replace(value, "").replace(/^[\s,:;\u2014-]+|[\s,:;\u2014-]+$/g, "");
    return [{ label: finding.tag, value, detail: detail || "What stood out" }];
  });

  if ((path === "connected" || path === "documents") && generatedMetrics.length >= 3) {
    return generatedMetrics.slice(0, 3);
  }

  if (path === "connected" || path === "documents") {
    return compactMetrics([
      { label: "What you want to learn", value: answerSummary(answers.audit_goals), detail: "What you told us" },
      { label: "How revenue changes", value: stringAnswer(answers.revenue_pattern), detail: "What you told us" },
      { label: "Biggest planned expense", value: stringAnswer(answers.biggest_cash_plan), detail: "What you told us" },
      { label: "Confidence in your books", value: stringAnswer(answers.books_confidence), detail: "What you told us" },
    ]);
  }

  return compactMetrics([
    { label: "Cash on hand", value: stringAnswer(answers.cash_on_hand), detail: "Your estimate" },
    { label: "Monthly spending", value: stringAnswer(answers.monthly_out), detail: "Your estimate" },
    { label: "Time to get paid", value: normalizePaymentTime(stringAnswer(answers.payment_time)), detail: "Your typical timing" },
  ]);
}

function isInsightFinding(finding: Finding): finding is InsightFinding {
  return "metric" in finding && "label" in finding && "narrative" in finding;
}

function findingLabel(finding: Finding): string {
  return plainLanguageFinancialLabel(isInsightFinding(finding) ? finding.label : finding.tag);
}

function findingNarrative(finding: Finding): string {
  return isInsightFinding(finding) ? finding.narrative : finding.consequence;
}

function findingSentimentClass(finding: Finding): string {
  return isInsightFinding(finding) ? `is-${finding.sentiment}` : "is-neutral";
}

function compactMetrics(metrics: ReportMetric[]): ReportMetric[] {
  return metrics.filter((metric) => metric.value).slice(0, 3);
}

function stringAnswer(value: AnswerValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function answerSummary(value: AnswerValue | undefined): string {
  if (typeof value === "string") return value;
  if (!value?.length) return "";
  return value.length === 1 ? value[0] : `${value[0]} +${value.length - 1} more`;
}

function normalizePaymentTime(value: string): string {
  if (value === "Some invoices over 60 days") return ">60 days";
  if (value === "Paid upfront") return "Upfront";
  return value;
}

function renderNumericCopy(value: string): ReactNode {
  const displayValue = cleanDisplayCopy(value);
  const matches = [...displayValue.matchAll(NUMBER_PATTERN)];
  if (matches.length === 0) return displayValue;

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    if (start > cursor) parts.push(displayValue.slice(cursor, start));
    parts.push(<span className="fha-number" key={`${match[0]}-${index}`}>{match[0]}</span>);
    cursor = start + match[0].length;
  });
  if (cursor < displayValue.length) parts.push(displayValue.slice(cursor));
  return parts;
}

function cleanDisplayCopy(value: string): string {
  // Reason: New reports are instructed to use everyday language, but saved or
  // model-generated copy can still contain accounting shorthand. Translate the
  // common terms at display time so no visitor needs accounting training to
  // understand the result, while defining the few precise terms we retain.
  return value
    .replace(/\s*\u2014\s*/g, ": ")
    .replace(/\bbuild a unpaid invoices collection plan\b/gi, "build an unpaid invoice collection plan")
    .replace(/\bcollections drive runway\b/gi, (match, offset, source) => preserveInitialCase(match, "collect unpaid invoices and protect cash", offset, source))
    .replace(/\bA\/R\b/g, (match, offset, source) => preserveInitialCase(match, "unpaid customer invoices", offset, source))
    .replace(/\baccounts receivable\b/gi, (match, offset, source) => preserveInitialCase(match, "unpaid customer invoices", offset, source))
    .replace(/\breceivables\b/gi, (match, offset, source) => preserveInitialCase(match, "unpaid invoices", offset, source))
    .replace(/\bA\/P\b/g, (match, offset, source) => preserveInitialCase(match, "bills the business owes", offset, source))
    .replace(/\baccounts payable\b/gi, (match, offset, source) => preserveInitialCase(match, "bills the business owes", offset, source))
    .replace(/\bpayables\b/gi, (match, offset, source) => preserveInitialCase(match, "unpaid bills", offset, source))
    .replace(/\bcash runway\b/gi, (match, offset, source) => preserveInitialCase(match, "how long your cash will last", offset, source))
    .replace(/\bburn rate\b/gi, (match, offset, source) => preserveInitialCase(match, "monthly cash use", offset, source))
    .replace(/\bnet margin\b/gi, (match, offset, source) => preserveInitialCase(match, "profit after all expenses", offset, source))
    .replace(/\bproject margins\b/gi, (match, offset, source) => preserveInitialCase(match, "profit per project", offset, source))
    .replace(/\boutflows\b/gi, (match, offset, source) => preserveInitialCase(match, "spending", offset, source))
    .replace(/\bliquidity\b/gi, (match, offset, source) => preserveInitialCase(match, "ability to cover near-term bills", offset, source))
    .replace(/\bmonth-end close\b/gi, (match, offset, source) => preserveInitialCase(match, "monthly bookkeeping review", offset, source))
    .replace(/\breconciliation\b/gi, (match, offset, source) => preserveInitialCase(match, "matching the books to source records", offset, source))
    .replace(/\bchart of accounts\b/gi, (match, offset, source) => preserveInitialCase(match, "bookkeeping category list", offset, source))
    .replace(/\bCOGS\b/g, (match, offset, source) => preserveInitialCase(match, "direct costs", offset, source))
    .replace(/\bP&L\b/g, (match, offset, source) => preserveInitialCase(match, "profit and loss statement", offset, source))
    .replace(/\bgross margin\b(?!\s*\()/gi, (match, offset, source) => preserveInitialCase(match, "gross margin (sales left after direct costs)", offset, source))
    .replace(/\bworking capital\b(?!\s*\()/gi, (match, offset, source) => preserveInitialCase(match, "working capital (short-term assets minus short-term bills)", offset, source))
    .replace(/\bcurrent ratio\b(?!\s*\()/gi, (match, offset, source) => preserveInitialCase(match, "current ratio (short-term assets divided by short-term bills)", offset, source))
    .replace(/\bEBITDA\b(?!\s*\()/g, "EBITDA (operating profit before interest, taxes, depreciation, and amortization)");
}

function conciseReportHeadline(value: string): string {
  // Reason: Reports saved before the compact headline contract can contain an
  // 18-word lede. Preserve their first complete thought in the serif thesis and
  // leave the full explanation in the supporting paragraph immediately below.
  const cleaned = cleanDisplayCopy(value).trim();
  if (cleaned.split(/\s+/).length <= 8) return cleaned;

  const firstClause = cleaned
    .split(/\s*,?\s+\b(?:but|while|because|so)\b\s+|[;:]/i, 1)[0]
    .replace(/[,.!?\s]+$/, "")
    .trim();
  if (firstClause && firstClause.split(/\s+/).length <= 8) return `${firstClause}.`;

  return `${cleaned.replace(/[.!?]+$/, "").split(/\s+/).slice(0, 8).join(" ")}…`;
}

function compactFindingMetric(value: string): string {
  // Reason: The colored evidence column is an entry point, not a second
  // narrative. New generation already limits this field; this formatter keeps
  // older saved reports equally scannable without changing their explanation.
  const cleaned = cleanDisplayCopy(value).trim();
  const moneyRange = cleaned.match(
    /\$\s?\d[\d,.]*(?:[kKmMbB])?\s*[–-]\s*\$?\s?\d[\d,.]*(?:[kKmMbB])?/,
  );
  if (moneyRange) return moneyRange[0].replace(/\s+/g, "");

  const number = cleaned.match(NUMBER_PATTERN)?.[0];
  if (number) return number.replace(/\s+/g, " ");

  const firstThought = cleaned.split(/[,;:]|\s+\b(?:and|but|while)\b\s+/i, 1)[0].trim();
  return firstThought.split(/\s+/).slice(0, 3).join(" ");
}

function preserveInitialCase(source: string, replacement: string, offset: number, fullValue: string): string {
  const startsSentence = offset === 0 || /[.!?]\s*$/.test(fullValue.slice(0, offset));
  const usesInitialCapital = /^[A-Z][a-z]/.test(source);
  if (!startsSentence && !usesInitialCapital) return replacement;
  return replacement.charAt(0).toLocaleUpperCase() + replacement.slice(1);
}

function plainLanguageActionLabel(value: string): string {
  if (value === "Structural") return "For the long term";
  return cleanDisplayCopy(value);
}

function plainLanguageFinancialLabel(value: string): string {
  const normalized = value.trim().toLocaleLowerCase();
  if (normalized === "receivables" || normalized === "accounts receivable" || normalized === "a/r") {
    return "Unpaid customer invoices";
  }
  return cleanDisplayCopy(value);
}
