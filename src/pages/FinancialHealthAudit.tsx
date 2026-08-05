import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import posthog from "posthog-js";
import { Nav } from "../primitives/Nav";
import { Seo } from "../components/Seo";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import {
  createFinancialHealthAudit,
  generateFinancialHealthAudit,
  getFinancialHealthQuickBooksConnection,
  startFinancialHealthQuickBooksConnection,
  updateFinancialHealthAudit,
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
    (candidate.path === null || candidate.path === "connected" || candidate.path === "unconnected") &&
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
    Array.isArray(candidate.findings) &&
    Array.isArray(candidate.actions) &&
    typeof candidate.confidenceTitle === "string" &&
    typeof candidate.confidenceBody === "string"
  );
}

export function FinancialHealthAudit() {
  return (
    <WaitlistProvider>
      <div className="fha-shell">
        <Seo
          title="Free Financial Health Audit | Porter"
          description="A guided financial health audit for small businesses, covering cash, margins, collections, and the quality of your books."
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
        <Nav />
        <AuditExperience />
      </div>
    </WaitlistProvider>
  );
}

function AuditExperience() {
  const [state, setState] = useState<AuditState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [reportPhase, setReportPhase] = useState<ReportPhase>("idle");
  const [reportError, setReportError] = useState("");
  const [quickBooksPhase, setQuickBooksPhase] = useState<QuickBooksPhase>("idle");
  const [quickBooksError, setQuickBooksError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const auditIdRef = useRef<string | null>(null);
  const auditTokenRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const backgroundSaveTimerRef = useRef<number | null>(null);
  const quickBooksIntentRef = useRef(false);
  const quickBooksNavigationRef = useRef(false);
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
          setState((current) => ({ ...current, path: "connected", stepId: "runway" }));
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

  const setAnswer = (name: string, value: AnswerValue) => {
    setState((current) => ({
      ...current,
      path: name === "connection_choice" && value === "skip" ? null : current.path,
      answers: { ...current.answers, [name]: value },
    }));
    if (name === "connection_choice" && value === "skip") {
      quickBooksIntentRef.current = false;
      quickBooksNavigationRef.current = false;
      setQuickBooksPhase("idle");
      setQuickBooksError("");
    }
    setValidationMessage("");
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

  const next = () => {
    if (!canContinue(step, state.answers)) {
      setValidationMessage("Choose an answer to continue.");
      return;
    }

    track("financial_health_audit_step_completed", {
      step_id: step.id,
      path: state.path ?? "shared",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });

    if (step.id === "business-type") track("financial_health_audit_started");

    if (step.id === "connect") {
      if (state.answers.connection_choice !== "skip") return;
      track("financial_health_audit_connection_selected", { selection: "declined" });
      setState((current) => ({ ...current, path: "unconnected", stepId: "context" }));
      return;
    }

    const activeFlow = state.path ? FLOWS[state.path] : SHARED_FLOW;
    const index = activeFlow.indexOf(state.stepId);
    const nextId = activeFlow[index + 1];
    if (!nextId) return;
    const nextState = { ...state, stepId: nextId, report: null };
    setState(nextState);
    if (STEPS[nextId].kind === "report") {
      void requestReport(nextState);
    }
  };

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
                  {step.id !== "connect" || state.answers.connection_choice === "skip" ? (
                    <button type="button" className="fha-button fha-button--primary" onClick={next}>
                      {step.id === "connect"
                        ? "Continue without QuickBooks"
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
          className={`fha-connect-card ${value === "skip" ? "is-selected" : ""}`}
          aria-pressed={value === "skip"}
          onClick={() => onChange("skip")}
          disabled={opening}
        >
          <span className="material-symbols-outlined fha-connect-icon" aria-hidden="true">touch_app</span>
          <strong>Continue without QuickBooks</strong>
          <small>Get a personalized view from a short questionnaire.</small>
        </button>
      </div>
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

function AuditAside({ step, questionsLeft, onConnect }: { step: AuditStep; questionsLeft: number; onConnect: () => void }) {
  if (step.aside === "scan") {
    return (
      <aside className="fha-aside" aria-live="polite">
        <p className="fha-aside__eyebrow"><span className="fha-scan-dot" />Reviewing your answers</p>
        <div className="fha-scan-lines" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
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
}: {
  report: AuditReport;
  path: AuditPath | null;
  answers: AuditAnswers;
  onRestart: () => void;
  onCta: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const metrics = getReportMetrics(report, path, answers);
  const booksBacked = path === "connected";
  return (
    <div className="fha-report-wrap">
      <article className="fha-report">
        <header className="fha-report__head">
          <p className="fha-report__eyebrow">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            {report.eyebrow}
          </p>
          <h1 ref={titleRef} tabIndex={-1}>{report.title}</h1>
          <p className="fha-report__lede">{report.lede}</p>
          {report.scopeNote ? <p className="fha-report__scope">{report.scopeNote}</p> : null}
        </header>

        <section className="fha-report__readout" aria-labelledby="fha-readout-title">
          <div className="fha-report__readout-heading">
            <div>
              <p className="fha-section-label">{booksBacked ? "Financial readout" : "Your financial baseline"}</p>
              <h2 id="fha-readout-title">
                {booksBacked ? "The figures Porter considered." : "The numbers behind this view."}
              </h2>
            </div>
            <p>{booksBacked ? connectedEvidenceLabel(report) : "Questionnaire"}</p>
          </div>
          <dl className="fha-readout">
            {metrics.map((metric) => (
              <div key={metric.label} className="fha-readout__metric">
                <dt>{metric.label}</dt>
                <dd>{renderNumericCopy(metric.value)}</dd>
                <p>{metric.detail}</p>
              </div>
            ))}
          </dl>
        </section>

        <section className="fha-report__section">
          <div className="fha-section-label">What stands out</div>
          <div className="fha-findings">
            {report.findings.map((finding, index) => (
              <div key={findingLabel(finding)} className={`fha-finding ${index === 0 ? "fha-finding--headline" : ""}`}>
                <div>
                  <p className="fha-finding__tag">{findingLabel(finding)}</p>
                  <h2>{renderNumericCopy(findingHeadline(finding))}</h2>
                  {isInsightFinding(finding) ? null : <p>{renderNumericCopy(finding.consequence)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="fha-report__section fha-confidence">
          <div className="fha-section-label">How certain this is</div>
          <h2>{report.confidenceTitle}</h2>
          <p>{report.confidenceBody}</p>
        </section>

        <section className="fha-report__section">
          <div className="fha-section-label">What to do next</div>
          <div className="fha-actions">
            {report.actions.map((action) => (
              <div key={action.label} className="fha-action">
                <span>{action.label}</span>
                <h3>{action.title}</h3>
                <p>{action.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="fha-report__cta">
          <div className="fha-report__cta-copy">
            <h2>Go beyond the snapshot.</h2>
            <p>Porter adds deeper history, ongoing insights, and hands-on financial management.</p>
          </div>
          <div className="fha-report__cta-actions">
            <button type="button" className="fha-button fha-button--primary fha-button--large" onClick={onCta}>Get the full Porter view</button>
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
    const detail = path === "connected" ? connectedEvidenceLabel(report) : "Questionnaire evidence";
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
    const detail = finding.fact.replace(value, "").replace(/^[\s,:;—-]+|[\s,:;—-]+$/g, "");
    return [{ label: finding.tag, value, detail: detail || "Porter signal" }];
  });

  if (path === "connected" && generatedMetrics.length >= 3) {
    return generatedMetrics.slice(0, 3);
  }

  if (path === "connected") {
    return compactMetrics([
      { label: "Cash runway", value: stringAnswer(answers.runway_guess), detail: "Your estimate" },
      { label: "Unpaid invoices", value: stringAnswer(answers.invoices_guess), detail: "Your estimate" },
      { label: "Books delivery", value: getConnectedCloseValue(answers), detail: "Your reporting cadence" },
    ]);
  }

  return compactMetrics([
    { label: "Cash on hand", value: stringAnswer(answers.cash_on_hand), detail: "Your estimate" },
    { label: "Monthly outflow", value: stringAnswer(answers.monthly_out), detail: "Your estimate" },
    { label: "Customer payment", value: normalizePaymentTime(stringAnswer(answers.payment_time)), detail: "Your typical timing" },
  ]);
}

function isInsightFinding(finding: Finding): finding is InsightFinding {
  return "metric" in finding && "label" in finding && "narrative" in finding;
}

function findingLabel(finding: Finding): string {
  return isInsightFinding(finding) ? finding.label : finding.tag;
}

function findingHeadline(finding: Finding): string {
  return isInsightFinding(finding) ? finding.narrative : finding.fact;
}

function connectedEvidenceLabel(report: AuditReport): string {
  return report.evidencePeriod
    ? `QuickBooks · ${formatEvidencePeriod(report.evidencePeriod)}`
    : "QuickBooks";
}

function formatEvidencePeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return period;
  return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2020, monthIndex, 1))} ${match[1]}`;
}

function compactMetrics(metrics: ReportMetric[]): ReportMetric[] {
  return metrics.filter((metric) => metric.value).slice(0, 3);
}

function stringAnswer(value: AnswerValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function getConnectedCloseValue(answers: AuditAnswers): string {
  return stringAnswer(answers.close_time_self)
    || stringAnswer(answers.close_time_staff)
    || stringAnswer(answers.financials_delivery)
    || stringAnswer(answers.bookkeeping);
}

function normalizePaymentTime(value: string): string {
  if (value === "Some invoices over 60 days") return ">60 days";
  if (value === "Paid upfront") return "Upfront";
  return value;
}

function renderNumericCopy(value: string): ReactNode {
  const matches = [...value.matchAll(NUMBER_PATTERN)];
  if (matches.length === 0) return value;

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    if (start > cursor) parts.push(value.slice(cursor, start));
    parts.push(<span className="fha-number" key={`${match[0]}-${index}`}>{match[0]}</span>);
    cursor = start + match[0].length;
  });
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}
