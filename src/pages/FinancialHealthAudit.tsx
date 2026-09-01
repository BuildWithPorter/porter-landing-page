import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Calligraph } from "calligraph";
import { useReducedMotion } from "motion/react";
import { Seo } from "../components/Seo";
import { MaterialIcon } from "../components/MaterialIcon";
import { openCalendlyPopup } from "../lib/calendly";
import {
  type AuditDocument,
  type FinancialHealthAuditEmailChallenge,
  type QuickBooksConnectionStatus,
} from "../services/financialHealthAudit";
import {
  STEPS,
  fieldIsVisible,
  type AnswerValue,
  type AuditAnswers,
  type AuditField,
  type AuditPath,
  type AuditReport,
  type AuditStep,
  type NarratedFinding,
} from "./financialHealthAuditFlow";
import {
  isAuditActionPlan,
  isNarratedFinding,
  quickBooksStatus,
  type ReportPhase,
  type ReportProgress,
  type ReportRecovery,
} from "./financialHealthAuditState";
import { trackFinancialHealthAudit, useFinancialHealthAuditController } from "./useFinancialHealthAuditController";
import "./FinancialHealthAudit.css";

type QuickBooksPhase = "idle" | "connecting" | "error";

const FINANCIAL_HEALTH_REVIEW_URL = "https://calendly.com/daniel-buildwithporter/30min";
const track = trackFinancialHealthAudit;

export function FinancialHealthAudit() {
  const waitingPreview = isWaitingPreview();
  const editorialPreview = isEditorialPreview();
  const leadGatePreview = isLeadGatePreview();
  const recoveryCodePreview = isRecoveryCodePreview();
  return (
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
      {recoveryCodePreview ? (
        <RecoveryCodePreview />
      ) : waitingPreview ? (
        <ReportPendingPreview />
      ) : editorialPreview ? (
        <EditorialReportPreview />
      ) : leadGatePreview ? (
        <LeadGatePreview />
      ) : (
        <AuditExperience />
      )}
    </div>
  );
}

function isWaitingPreview(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "report-wait";
}

function isEditorialPreview(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "editorial-report";
}

function isLeadGatePreview(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "lead-gate";
}

function isRecoveryCodePreview(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("preview") === "recovery-code";
}

const EDITORIAL_REPORT_PREVIEW: AuditReport = {
  version: 2,
  eyebrow: "Audit complete",
  title: "Three things worth your attention.",
  lede: "Cash is tighter than your hiring plan allows",
  analysisSummary: "",
  findings: [
    {
      checkId: "B1_last_entry",
      stat: "35 days",
      verdict: "needs_attention",
      title: "Your books are behind",
      body: "The newest recorded transaction is 35 days old, so every cash and profit figure is based on stale records. That usually means recent income, bills, or bank activity still has to be posted. Before you commit to another hire, the current month needs to be brought into the books.",
      fixNote: "Someone needs to post recent bank activity and reconcile every account.",
      tiedTo: "books_health",
      locked: false,
    },
    {
      checkId: "C1_cash_safety",
      stat: "$18,240",
      verdict: "needs_attention",
      title: "Cash has little breathing room",
      body: "Recorded cash is only slightly above the near-term bills in QuickBooks. That gives the business less room for the hiring plan you selected. The number may improve after collection work, but the current records do not support a relaxed cash decision yet.",
      fixNote: "Someone needs to set a weekly cash floor before approving new spending.",
      tiedTo: "cash_safety",
      locked: false,
    },
    {
      checkId: "C2_receivables_aging",
      stat: "$12,680",
      verdict: "needs_attention",
      title: "Customer payments are running late",
      body: "$12,680 of customer balances are already past due. That money would create more room before adding payroll, but it is not cash until someone follows up and collects it. The hiring decision should assume those invoices remain unavailable until they are assigned and worked.",
      fixNote: "Someone needs to call the oldest customers and assign every overdue balance.",
      tiedTo: "collections",
      locked: false,
    },
  ],
  additionalFindings: [
    {
      checkId: "O1_expense_direction",
      stat: "$4,120",
      verdict: "fact",
      title: "Monthly costs moved higher",
      body: "The review period shows a recent cost shift that may be narrowing the room for new payroll. The records do not say whether that increase is temporary or structural. Before hiring, the largest cost categories need to be checked against the work that created them.",
      fixNote: "Someone needs to compare the largest cost categories with recent jobs and vendor bills.",
      tiedTo: "growth",
      locked: true,
    },
    {
      checkId: "C3_payables_aging",
      stat: "$4,120",
      verdict: "needs_attention",
      title: "Vendor timing needs attention",
      body: "Older unpaid bills could affect the next cash decision if they are still valid and due soon. The aging report shows pressure that does not appear in the bank balance alone. Before spending against cash, the business needs to confirm what must be paid first.",
      fixNote: "Someone needs to review every old vendor bill and mark what is still owed.",
      tiedTo: "cash_safety",
      locked: true,
    },
    {
      checkId: "B2_uncategorized_activity",
      stat: "18 transactions",
      verdict: "needs_attention",
      title: "Some activity needs cleanup",
      body: "Placeholder categories may be hiding where money actually went. That makes cost decisions harder because the records can show total spending without explaining the driver. The cleanup work should happen before using the report to approve a recurring expense.",
      fixNote: "Someone needs to categorize each placeholder transaction and review new ones weekly.",
      tiedTo: "books_health",
      locked: true,
    },
  ],
  confidenceTitle: "",
  confidenceBody: "",
  actions: [],
  headline: "Cash is tighter than your hiring plan allows",
  reviewPeriod: "May 1 to July 31, 2026",
  summary: "Your books are more than a month behind, which makes the current cash and profit picture provisional. Recorded cash is only modestly above near-term bills, while customer payments past due could improve that position. Before hiring, update the books and collect the oldest balances. Those two moves will tell you whether the plan is actually affordable.",
  actionPlan: {
    thisWeek: [
      { title: "Bring the books current", body: "Match the newest bank activity and confirm that every sale and bill is recorded." },
      { title: "Call on the oldest balances", body: "Start with the customer balances that are furthest past due and assign each follow-up." },
    ],
    thisQuarter: [
      { title: "Set a weekly cash floor", body: "Choose the minimum bank balance the business will protect before approving new spending." },
    ],
  },
  keyMetrics: [],
  featuredComparison: {
    eyebrow: "Cash safety",
    title: "Cash compared with near-term obligations",
    leftLabel: "Cash in bank",
    leftValue: "$18,240",
    rightLabel: "Near-term bills",
    rightValue: "$15,900",
    ratio: "1.1×",
    interpretation: "Recorded cash is only modestly higher than the near-term bills and balances on the books.",
  },
  evidenceBlocks: [
    {
      title: "Customer payment aging",
      description: "QuickBooks balances grouped by how long they have been open as of the audit date.",
      columns: ["Age", "Amount"],
      rows: [["Current", "$9,400"], ["1-30", "$7,220"], ["31-60", "$3,480"], ["61-90", "$2,060"], ["Over 90", "$1,140"]],
    },
    {
      title: "Recent recorded activity",
      description: "The newest QuickBooks transactions used to check freshness and categorization.",
      columns: ["Date", "Type", "Name", "Amount", "Account"],
      rows: [["Jul 10, 2026", "Invoice", "Oak & Co.", "$4,800", "Design income"], ["Jul 8, 2026", "Bill", "Northstar Supply", "$1,260", "Materials"]],
    },
  ],
  reliabilityNote: "The audit covered the requested QuickBooks statements, aging reports, and recent activity. Recording the missing month would make the cash and profit findings sharper.",
  reliabilityAreas: [],
  evidencePeriod: "2026-08",
  scopeNote: "",
  asOfDate: "2026-08-14",
  reportingBasis: "Accrual basis",
  auditPacketVersion: "2026-08-14",
  isSample: false,
};

function EditorialReportPreview() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <main className="fha-main">
      <ReportView
        report={EDITORIAL_REPORT_PREVIEW}
        path="connected"
        capturedEmail="owner@example.com"
        capturedFirstName="Michael"
        titleRef={titleRef}
      />
    </main>
  );
}

function ReportPendingPreview() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <main className="fha-main">
      <ReportPendingView
        phase="generating"
        progress="analyzing"
        queuePosition={0}
        estimatedWaitSeconds={60}
        thinkingText=""
        error=""
        recovery="retry"
        onRetry={() => undefined}
        onReconnectQuickBooks={() => undefined}
        onSignIn={() => undefined}
        onBack={() => undefined}
        titleRef={titleRef}
        documents={[]}
        uploadActive={false}
      />
    </main>
  );
}

function LeadGatePreview() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <main className="fha-main">
      <LeadCaptureView
        onSubmit={async () => undefined}
        onBack={() => undefined}
        titleRef={titleRef}
      />
    </main>
  );
}

function RecoveryCodePreview() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  return (
    <main className="fha-main">
      <RecoveryAuthView
        email="owner@example.com"
        initialError=""
        initialChallenge={{ challengeId: "local-preview", developmentCode: "421903" }}
        onStartEmail={async () => ({ challengeId: "local-preview", developmentCode: "421903" })}
        onVerifyEmail={async () => new Promise(() => undefined)}
        onBack={() => undefined}
        titleRef={titleRef}
      />
    </main>
  );
}

function AuditExperience() {
  const controller = useFinancialHealthAuditController();
  const {
    state,
    screen,
    titleRef,
    step,
    flow,
    questionSteps,
    stepIndex,
    choiceAdvancesImmediately,
    quickBooksUiPhase,
    quickBooksError,
    actions,
  } = controller;
  const { session, documents, report, quickBooks } = state;

  return (
    <main className="fha-main">
      {screen === "boot" ? null : screen === "recovery" && state.recovery.session ? (
        <RecoveryAuthView
          email={state.recovery.session.email}
          initialError={state.recovery.error}
          titleRef={titleRef}
          onBack={actions.cancelRecovery}
          onStartEmail={actions.startRecoveryEmail}
          onVerifyEmail={actions.verifyRecoveryEmail}
        />
      ) : screen === "quickbooks-error" && quickBooks.phase === "failed" ? (
        <ReportPendingView
          phase="error"
          error={quickBooks.error}
          recovery="quickbooks"
          onRetry={() => undefined}
          onReconnectQuickBooks={actions.startQuickBooks}
          onSignIn={actions.signInToPorter}
          onBack={actions.back}
          titleRef={titleRef}
          progress="saving"
          queuePosition={null}
          estimatedWaitSeconds={null}
          thinkingText=""
          documents={[]}
          uploadActive={false}
        />
      ) : screen === "report" && session.report ? (
        <ReportView
          report={session.report}
          path={session.path}
          capturedEmail={session.capturedEmail}
          capturedFirstName={session.capturedFirstName}
          titleRef={titleRef}
        />
      ) : screen === "lead" ? (
        <LeadCaptureView
          initialEmail={session.capturedEmail ?? ""}
          initialError={state.validationMessage}
          onSubmit={actions.beginAudit}
          onBack={actions.back}
          titleRef={titleRef}
        />
      ) : screen === "report-pending" ? (
        <ReportPendingView
          phase={report.phase}
          error={report.error}
          recovery={report.recovery}
          onRetry={actions.retryReport}
          onReconnectQuickBooks={actions.startQuickBooks}
          onSignIn={actions.signInToPorter}
          onBack={actions.back}
          titleRef={titleRef}
          progress={report.progress}
          queuePosition={null}
          estimatedWaitSeconds={null}
          thinkingText={report.thinking}
          documents={session.path === "documents" ? documents.items : []}
          uploadActive={session.path === "documents" && documents.uploadActive}
        />
      ) : (
        <div className={`fha-stage ${step.aside === "intro" ? "fha-stage--solo" : ""}`}>
          <section
            className={`fha-card ${step.id === "connect" ? "fha-card--connect" : ""}`}
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
                <ContextField answers={session.answers} setAnswer={actions.setAnswer} />
              ) : step.kind === "documents" ? (
                <DocumentUploadField
                  documents={documents.items}
                  error={documents.error}
                  uploading={documents.uploadActive}
                  checking={documents.preflightActive}
                  onFiles={actions.uploadDocuments}
                />
              ) : (
                step.fields?.map((field) => (
                  <AuditFieldControl
                    key={field.name}
                    field={field}
                    answers={session.answers}
                    onChange={actions.setAnswer}
                    onQuickBooks={step.id === "connect" ? actions.startQuickBooks : undefined}
                    quickBooksPhase={step.id === "connect" ? quickBooksUiPhase : undefined}
                    quickBooksError={step.id === "connect" ? quickBooksError : undefined}
                  />
                ))
              )}
            </div>

            <div className="fha-card__foot">
              <div>
                {step.id !== "business-type" ? (
                  <button
                    type="button"
                    className="fha-button fha-button--quiet"
                    onClick={actions.back}
                    disabled={documents.preflightActive}
                  >Back</button>
                ) : <span />}
              </div>
              <div className="fha-card__advance">
                <p id="fha-validation" className="fha-validation" aria-live="polite">
                  {state.validationMessage}
                </p>
                {!choiceAdvancesImmediately &&
                  (step.id !== "connect" ||
                    session.answers.connection_choice === "questions" ||
                    session.answers.connection_choice === "skip" ||
                    session.answers.connection_choice === "documents") ? (
                  <button
                    type="button"
                    className="fha-button fha-button--primary"
                    onClick={actions.next}
                    disabled={documents.preflightActive}
                  >
                    {documents.preflightActive
                      ? "Checking files..."
                      : step.id === "connect"
                        ? session.answers.connection_choice === "documents"
                          ? "Upload documents"
                          : "Answer a few questions"
                        : STEPS[flow[stepIndex + 1]]?.kind === "report"
                          ? "See my report"
                          : "Continue"}
                    <MaterialIcon name="arrow_forward" />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <AuditAside
            step={step}
            questionsLeft={Math.max(0, questionSteps.length - stepIndex - 1)}
            onConnect={actions.startQuickBooks}
            documents={documents.items}
            showDocumentProgress={session.path === "documents"}
            connectedPath={session.path === "connected"}
            quickBooksConnectionStatus={quickBooksStatus(quickBooks)}
          />
        </div>
      )}

      {state.hydration === "ready" &&
        (screen === "quickbooks-error" ||
          (screen === "questionnaire" && session.stepId !== "business-type")) ? (
        <button type="button" className="fha-restart" onClick={actions.restart}>
          <MaterialIcon name="restart_alt" />
          {screen === "quickbooks-error" ? "Start new audit" : "Restart audit"}
        </button>
      ) : null}
    </main>
  );
}

function LeadCaptureView({
  initialEmail = "",
  initialError = "",
  onSubmit,
  titleRef,
}: {
  initialEmail?: string;
  initialError?: string;
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState(initialError);

  const run = async () => {
    const form = formRef.current;
    if (!form?.reportValidity() || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      await onSubmit(email);
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Porter could not save your details. Check them and try again.",
      );
      track("financial_health_audit_lead_capture_failed");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run();
  };

  useEffect(() => {
    track("financial_health_audit_lead_gate_viewed");
  }, []);

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-lead-gate">
        <div className="fha-lead-gate__intro">
          <div className="fha-lead-gate__copy">
            {/* Reason: Explain the real privacy benefit without implying that typing an email verifies identity. */}
            <h1 ref={titleRef} tabIndex={-1}>Keep your audit private and easy to return to.</h1>
            <p>Enter your email to save your progress. No account or password needed.</p>
          </div>
          <div className="fha-lead-gate__folio" aria-label="Your report will include six findings">
            <span>Financial health audit</span>
            <strong>06</strong>
            <p>findings grounded in your financial information</p>
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
            </div>
          </div>
        </div>

        <form ref={formRef} className="fha-lead-gate__form" onSubmit={submit}>
          <div className="fha-lead-gate__fields">
            <label htmlFor="fha-lead-email">
              <span>Email</span>
              <input
                id="fha-lead-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
          </div>
          <p>We’ll verify it’s you when you return, and use this address for audit updates and helpful follow-ups.</p>
          {/* Reason: A rotated bearer is an ownership-proof problem, not a
              report failure. Keep the explanation visible while the visitor
              re-enters the canonical email recovery flow. */}
          {error ? <p className="fha-lead-gate__error" role="alert">{error}</p> : null}
          <div className="fha-lead-gate__actions">
            <button type="submit" className="fha-button fha-button--primary" disabled={status === "submitting"}>
              {status === "submitting" ? "Saving…" : "Continue"}
              <MaterialIcon name="arrow_forward" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RecoveryAuthView({
  email,
  initialError,
  initialChallenge,
  onStartEmail,
  onVerifyEmail,
  onBack,
  titleRef,
}: {
  email: string;
  initialError: string;
  initialChallenge?: FinancialHealthAuditEmailChallenge;
  onStartEmail: () => Promise<FinancialHealthAuditEmailChallenge>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<void>;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [challenge, setChallenge] = useState<FinancialHealthAuditEmailChallenge | null>(
    initialChallenge ?? null,
  );
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);

  const startEmail = async () => {
    if (status !== "idle") return;
    setStatus("sending");
    setError("");
    try {
      const nextChallenge = await onStartEmail();
      setChallenge(nextChallenge);
      setCode("");
      setStatus("idle");
      track("financial_health_audit_recovery_code_sent");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "Porter could not send the verification code. Try again.",
      );
      track("financial_health_audit_recovery_auth_failed");
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge || status !== "idle" || code.length !== 6) return;
    setStatus("verifying");
    setError("");
    try {
      await onVerifyEmail(challenge.challengeId, code);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "That code could not be verified.");
      track("financial_health_audit_recovery_code_failed");
    }
  };

  useEffect(() => {
    track("financial_health_audit_recovery_auth_viewed");
  }, []);

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-lead-gate fha-recovery-auth">
        <div className="fha-lead-gate__intro">
          <div className="fha-lead-gate__copy">
            {/* Reason: Returning visitors may have unfinished saved work, not a report yet. */}
            <p className="fha-lead-gate__eyebrow">Your saved audit is here</p>
            <h1 ref={titleRef} tabIndex={-1}>{challenge ? "Check your inbox." : "Welcome back."}</h1>
            <p>
              {challenge ? (
                <>
                  Enter the 6-digit code sent to <strong>{email}</strong>. Delivery can take up to a minute.
                </>
              ) : (
                <>We’ve saved your audit for <strong>{email}</strong>. Verify your email
                to pick up where you left off.</>
              )}
            </p>
          </div>
          <div className="fha-lead-gate__folio fha-recovery-auth__folio" aria-hidden="true">
            <span>Protected audit</span>
            <MaterialIcon name="lock" />
            <p>Your QuickBooks data and uploaded documents stay private.</p>
          </div>
        </div>

        <div className="fha-lead-gate__form">
          {challenge ? (
            <form className="fha-recovery-code" onSubmit={submitCode}>
              <label htmlFor="fha-recovery-code">Verification code</label>
              <div className="fha-recovery-code__entry">
                <div className="fha-recovery-code__boxes" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => <span key={index}>{code[index] ?? ""}</span>)}
                </div>
                <input
                  id="fha-recovery-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-describedby={error ? "fha-recovery-error" : undefined}
                  autoFocus
                />
              </div>
              {challenge.developmentCode ? (
                <p className="fha-recovery-code__development">Local test code: <strong>{challenge.developmentCode}</strong></p>
              ) : null}
              {error ? <p id="fha-recovery-error" className="fha-lead-gate__error" role="alert">{error}</p> : null}
              <button type="submit" className="fha-button fha-button--primary fha-recovery-auth__method" disabled={status !== "idle" || code.length !== 6}>
                {status === "verifying" ? "Verifying…" : "Verify and continue"}
                <MaterialIcon name="arrow_forward" />
              </button>
              <div className="fha-recovery-code__links">
                <button type="button" className="fha-recovery-code__link" onClick={() => void startEmail()} disabled={status !== "idle"}>Resend code</button>
                <button type="button" className="fha-recovery-code__link" onClick={onBack} disabled={status !== "idle"}>Use a different email</button>
              </div>
            </form>
          ) : (
            <>
              <div className="fha-recovery-auth__notice">
                <MaterialIcon name="verified_user" />
                <p>Verify the email on this report to continue.</p>
              </div>
              {error ? <p className="fha-lead-gate__error" role="alert">{error}</p> : null}
              <div id="recovery-auth-methods" className="fha-recovery-auth__methods">
                <button type="button" className="fha-button fha-button--primary fha-recovery-auth__method" onClick={() => void startEmail()} disabled={status !== "idle"}>
                  {/* Reason: This action proves ownership of the entered email,
                      so the label should name that security step directly. */}
                  {status === "sending" ? "Sending code…" : "Verify my email"}
                  <MaterialIcon name="arrow_forward" />
                </button>
                <button type="button" className="fha-button fha-button--quiet fha-recovery-auth__different" onClick={onBack} disabled={status !== "idle"}>
                  Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ReportPendingView({
  phase,
  progress,
  queuePosition,
  estimatedWaitSeconds,
  thinkingText,
  error,
  recovery,
  onRetry,
  onReconnectQuickBooks,
  onSignIn,
  onBack,
  titleRef,
  documents,
  uploadActive,
}: {
  phase: ReportPhase;
  progress: ReportProgress;
  queuePosition: number | null;
  estimatedWaitSeconds: number | null;
  thinkingText: string;
  error: string;
  recovery: ReportRecovery;
  onRetry: () => void;
  onReconnectQuickBooks: () => void;
  onSignIn: () => void;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  documents: AuditDocument[];
  uploadActive: boolean;
}) {
  const loading = phase !== "error";
  const reducedMotion = useReducedMotion();
  const status = reportWaitStatus(progress, queuePosition, thinkingText, documents, uploadActive);
  const elapsedSeconds = useElapsedSeconds(loading);
  const waitTime = queuePosition !== null && queuePosition > 0
    ? formatWaitTime(estimatedWaitSeconds)
    : formatElapsedWait(elapsedSeconds);
  const showFiles = documents.length > 0;

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-report-pending">
        {loading ? (
          <div className={`fha-report-wait ${showFiles ? "has-files" : ""}`}>
            <div className="fha-report-wait__headline" role="status" aria-live="polite" aria-atomic="true">
              <span className="fha-report-wait__pixels" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
              </span>
              <h1 ref={titleRef} tabIndex={-1}>
                {reducedMotion ? (
                  status
                ) : (
                  <Calligraph
                    animation="smooth"
                    autoSize
                    drift={{ x: 4, y: 1 }}
                    trend={0}
                    stagger={0.004}
                  >
                    {status}
                  </Calligraph>
                )}
              </h1>
              {waitTime ? <p>{waitTime}</p> : null}
            </div>
            {showFiles ? <DocumentFileList documents={documents} /> : null}
          </div>
        ) : (
          <>
            <div className="fha-card__head">
              <h1 ref={titleRef} tabIndex={-1}>
                {recovery === "quickbooks"
                  ? "QuickBooks import stopped."
                  : "Your report did not finish."}
              </h1>
              <p role="alert">{error}</p>
            </div>
            <div className="fha-card__foot">
              {recovery === "quickbooks" ? (
                <>
                  <button type="button" className="fha-button fha-button--quiet" onClick={onSignIn}>
                    Sign in to Porter
                  </button>
                  <button type="button" className="fha-button fha-button--primary" onClick={onReconnectQuickBooks}>
                    Reconnect QuickBooks
                    <MaterialIcon name="refresh" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="fha-button fha-button--quiet" onClick={onBack}>
                    Back
                  </button>
                  <button type="button" className="fha-button fha-button--primary" onClick={onRetry}>
                    Generate report
                    <MaterialIcon name="refresh" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function reportWaitStatus(
  progress: ReportProgress,
  queuePosition: number | null,
  thinkingText: string,
  documents: AuditDocument[],
  uploadActive: boolean,
): string {
  // Reason: "Joining queue" used to short-circuit here and win over everything
  // below, including a real activity string. On the QuickBooks path progress
  // stays "saving" for the whole ledger import, so a visitor watching a long
  // import saw "Joining queue" with a climbing timer for the entire wait while
  // "Importing your QuickBooks records" sat unused. There is also usually no
  // queue at all -- the genuine queue case is the queuePosition branch below.
  // Prefer any real activity, and never invent a queue.
  if (progress === "saving" && !thinkingText.trim() && !(queuePosition !== null && queuePosition > 0)) {
    return "Starting your audit";
  }
  if (progress === "reading") {
    return uploadActive || documents.some((document) => document.status === "uploading")
      ? "Uploading files"
      : "Reading files";
  }
  if (queuePosition !== null && queuePosition > 0) {
    return `${queuePosition} ahead`;
  }
  const trimmed = thinkingText.trim();
  if (!trimmed) return "Starting reasoning";
  // Reason: Porter already collapsed the thinking stream into a compact
  // activity tag on generationActivity. Re-parsing that tag as Markdown
  // headings turned published titles such as "Checking cash coverage"
  // back into generic "Reasoning", and heading-less thinking never left
  // "Starting reasoning".
  return latestReasoningSectionTitle(trimmed) ?? trimmed;
}

function latestReasoningSectionTitle(text: string): string | null {
  let latest: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
    const lineStartBold = trimmed.match(/^(?:[-*•·]\s*)?\*\*([^*\n]+)\*\*/);
    const title = (markdownHeading?.[1] ?? lineStartBold?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (title) latest = title;
  }
  // Reason: Porter chat labels its collapsed thinking tag with the latest
  // model-authored reasoning heading. Mirroring that rule makes this waiting
  // copy follow the actual analysis instead of an elapsed-time script.
  return latest;
}

function formatWaitTime(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `≈ ${Math.max(1, Math.ceil(seconds / 60))} min`;
}

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  return seconds;
}

function formatElapsedWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  const elapsed = `${minutes}:${remainder}`;
  // Reason: Actual audit runs exceeded the old one-minute promise; report elapsed time without inventing an ETA.
  return `${elapsed} elapsed`;
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
            <span>{done ? <MaterialIcon name="check" /> : index + 1}</span>
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
              {option.icon ? <MaterialIcon name={option.icon} /> : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {field.note ? (
        <p className="fha-guess-note">
          <MaterialIcon name="compare_arrows" />
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
  const opening = phase === "connecting";
  return (
    <fieldset className="fha-field">
      <legend className="fha-field__label fha-visually-hidden">Connection choice</legend>
      <div className="fha-connect-grid">
        <button
          type="button"
          className={`fha-connect-card fha-connect-card--featured ${value === "quickbooks" ? "is-selected" : ""}`}
          aria-pressed={value === "quickbooks"}
          aria-busy={opening || undefined}
          onClick={() => (onQuickBooks ? onQuickBooks() : onChange("quickbooks"))}
          disabled={opening}
        >
          <ConnectionCardVisual variant="quickbooks" />
          <span className="fha-connect-card__body">
            <span className="fha-connect-card__eyebrow">Connect live books</span>
            <strong>{opening ? "Opening QuickBooks…" : "I use QuickBooks"}</strong>
            <small>Connect for a books-backed checkup.</small>
          </span>
          <span className="fha-connect-card__arrow"><MaterialIcon name="arrow_forward" /></span>
        </button>
        <button
          type="button"
          className={`fha-connect-card ${value === "documents" ? "is-selected" : ""}`}
          aria-pressed={value === "documents"}
          onClick={() => onChange("documents")}
          disabled={opening}
        >
          <ConnectionCardVisual variant="documents" />
          <span className="fha-connect-card__body">
            <span className="fha-connect-card__eyebrow">Use your records</span>
            <strong>Upload financial documents</strong>
            <small>Drop in the reports and statements you already have.</small>
          </span>
          <span className="fha-connect-card__arrow"><MaterialIcon name="arrow_forward" /></span>
        </button>
        <button
          type="button"
          className={`fha-connect-card ${value === "questions" || value === "skip" ? "is-selected" : ""}`}
          aria-pressed={value === "questions" || value === "skip"}
          onClick={() => onChange("questions")}
          disabled={opening}
        >
          <ConnectionCardVisual variant="questions" />
          <span className="fha-connect-card__body">
            <span className="fha-connect-card__eyebrow">No files needed</span>
            <strong>Answer a few questions</strong>
            <small>Get a quick, directional checkup without sharing files.</small>
          </span>
          <span className="fha-connect-card__arrow"><MaterialIcon name="arrow_forward" /></span>
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

type ConnectionCardVariant = "quickbooks" | "documents" | "questions";

function ConnectionCardVisual({ variant }: { variant: ConnectionCardVariant }) {
  return (
    // Reason: Each source gets one legible motion cue; dense miniature
    // financial detail becomes decorative noise at this card size.
    <span className={`fha-connect-visual fha-connect-visual--${variant}`} aria-hidden="true">
      {variant === "quickbooks" ? (
        <>
          <span className="fha-connect-visual__qb">qb</span>
          <span className="fha-connect-visual__stream">
            <i />
            <i />
            <i />
          </span>
          <span className="fha-connect-visual__bars">
            <i />
            <i />
            <i />
          </span>
        </>
      ) : variant === "documents" ? (
        <span className="fha-connect-visual__documents">
          <i />
          <i />
          <MaterialIcon name="upload_file" />
        </span>
      ) : (
        <span className="fha-connect-visual__conversation">
          <i className="fha-connect-visual__bubble fha-connect-visual__bubble--back" />
          <i className="fha-connect-visual__bubble fha-connect-visual__bubble--front">
            <b />
            <b />
            <b />
          </i>
        </span>
      )}
    </span>
  );
}

function ContextField({
  answers,
  setAnswer,
}: {
  answers: AuditAnswers;
  setAnswer: (name: string, value: AnswerValue) => void;
}) {
  const value = typeof answers.business_description === "string"
    ? answers.business_description
    : "";
  return (
    <div className="fha-context">
      <label className="fha-field">
        <span className="fha-field__label">What does your business do?</span>
        <textarea
          value={value}
          placeholder="One or two sentences is plenty."
          onChange={(event) => setAnswer("business_description", event.target.value)}
        />
      </label>
      <p className="fha-context__optional">Optional. Used only to tailor the findings.</p>
    </div>
  );
}

function documentStatusLabel(status: AuditDocument["status"]): string {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Could not read";
  if (status === "uploading") return "Uploading…";
  return "Reading…";
}

function DocumentFileList({ documents }: { documents: AuditDocument[] }) {
  return (
    <ul className="fha-document-list" aria-live="polite">
      {documents.map((document) => (
        <li key={document.id}>
          <MaterialIcon name="description" />
          <span className="fha-document-list__name">{document.filename}</span>
          <span className={`fha-document-list__status is-${document.status}`}>
            {documentStatusLabel(document.status)}
          </span>
          {document.errorMessage ? <small>{document.errorMessage}</small> : null}
        </li>
      ))}
    </ul>
  );
}

function DocumentUploadField({
  documents,
  error,
  uploading,
  checking,
  onFiles,
}: {
  documents: AuditDocument[];
  error: string;
  uploading: boolean;
  checking: boolean;
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
              <MaterialIcon name={item.icon} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <label
        className={`fha-document-dropzone ${uploading || checking ? "is-uploading" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!uploading && !checking && event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.tsv,.txt,.md,.docx,.xlsx,.xls,.xlsm,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
          disabled={uploading || checking}
          onChange={(event) => {
            if (event.currentTarget.files?.length) onFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <MaterialIcon name="cloud_upload" />
        <strong>
          {checking
            ? "Checking your files..."
            : uploading
              ? "Uploading your files…"
              : "Drop files here, or choose files"}
        </strong>
        <small>PDF, spreadsheet, Word, image, or text file. Up to 50 files, 50MB each.</small>
      </label>
      <p className="fha-document-hint">
        For the strongest audit, include a recent profit and loss, balance sheet, bank or card statement, and A/R or A/P aging report.
      </p>
      {documents.length ? <DocumentFileList documents={documents} /> : null}
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
        <MaterialIcon name="document_scanner" />
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
  connectedPath,
  quickBooksConnectionStatus,
}: {
  step: AuditStep;
  questionsLeft: number;
  onConnect: () => void;
  documents: AuditDocument[];
  showDocumentProgress: boolean;
  connectedPath: boolean;
  quickBooksConnectionStatus: QuickBooksConnectionStatus;
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
    const quickBooksStatus = connectedPath ? (
      <div className={`fha-aside__qbo-status is-${quickBooksConnectionStatus}`} role="status">
        <span className="fha-scan-dot" aria-hidden="true" />
        <span>
          {quickBooksConnectionStatus === "connected"
            ? "QuickBooks ready"
            : "Importing QuickBooks"}
        </span>
      </div>
    ) : (
      <button type="button" className="fha-aside__connect" onClick={onConnect}>
        <span className="fha-qb fha-qb--small">qb</span>
        I use QuickBooks
      </button>
    );
    return (
      <aside className="fha-aside">
        <strong className="fha-counter">{questionsLeft}</strong>
        <span className="fha-counter__label">question{questionsLeft === 1 ? "" : "s"} to go</span>
        {quickBooksStatus}
        {documentProgress}
      </aside>
    );
  }
  return null;
}

type ReportViewProps = {
  report: AuditReport;
  path: AuditPath | null;
  capturedEmail: string | null;
  capturedFirstName: string | null;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

function ReportView(props: ReportViewProps) {
  // Reason: isAuditReport rejects anything that is not the version-2 editorial
  // contract, so this narrowing cannot fall through in practice. It stays as a
  // type guard rather than a cast.
  if (isEditorialAuditReport(props.report)) {
    return <EditorialReportView {...props} report={props.report} />;
  }
  return null;
}

type EditorialAuditReport = Omit<AuditReport, "findings" | "additionalFindings"> & {
  version: 2;
  headline: string;
  reviewPeriod: string;
  summary: string;
  findings: NarratedFinding[];
  additionalFindings?: NarratedFinding[];
  actionPlan: NonNullable<AuditReport["actionPlan"]>;
  reliabilityNote: string;
};

function isEditorialAuditReport(report: AuditReport): report is EditorialAuditReport {
  return (
    report.version === 2 &&
    typeof report.headline === "string" &&
    typeof report.reviewPeriod === "string" &&
    typeof report.summary === "string" &&
    report.findings.every(isNarratedFinding) &&
    (report.additionalFindings?.every(isNarratedFinding) ?? true) &&
    isAuditActionPlan(report.actionPlan) &&
    typeof report.reliabilityNote === "string"
  );
}

type EditorialFindingTone = "neutral" | "positive" | "caution";

type EditorialFindingSlide =
  {
    key: string;
    index: number;
    finding: NarratedFinding;
  };

function getEditorialFindingSlides(findings: NarratedFinding[], indexOffset = 0): EditorialFindingSlide[] {
  return findings.map((finding, index) => ({
    key: `finding-${finding.checkId}`,
    index: index + indexOffset,
    finding,
  }));
}

function findingTone(finding: NarratedFinding): EditorialFindingTone {
  if (finding.verdict === "looks_good") return "positive";
  if (finding.verdict === "needs_attention") return "caution";
  return "neutral";
}

function findingVerdictLabel(verdict: NarratedFinding["verdict"]): string | null {
  if (verdict === "looks_good") return "Looks good";
  if (verdict === "needs_attention") return "Needs attention";
  return null;
}


function EditorialFindingCarousel({
  slides,
  sectionId,
  eyebrow,
  title,
  className = "",
}: {
  slides: EditorialFindingSlide[];
  sectionId: string;
  eyebrow: string;
  title: string;
  className?: string;
}) {
  const [activeFinding, setActiveFinding] = useState(0);
  const safeActiveFinding = Math.min(activeFinding, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeActiveFinding];
  const titleId = `${sectionId}-title`;

  if (!currentSlide) return null;

  return (
    <section
      id={sectionId}
      className={`fha-editorial-findings${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
    >
      <div className="fha-editorial-container">
        <div className="fha-editorial-section-head">
          <div>
            <p className="fha-editorial-section-mark">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <nav className="fha-editorial-finding-nav" aria-label={`${title} carousel`}>
            <p>
              {String(safeActiveFinding + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")}
            </p>
            <div className="fha-editorial-finding-nav__arrows">
              <button
                type="button"
                aria-label={`Previous ${title.toLocaleLowerCase()}`}
                onClick={() => setActiveFinding((current) => (current - 1 + slides.length) % slides.length)}
              >
                <MaterialIcon name="arrow_back" />
              </button>
              <button
                type="button"
                aria-label={`Next ${title.toLocaleLowerCase()}`}
                onClick={() => setActiveFinding((current) => (current + 1) % slides.length)}
              >
                <MaterialIcon name="arrow_forward" />
              </button>
            </div>
          </nav>
        </div>
        <div className="fha-editorial-finding-stage" aria-live="polite">
          <div
            className="fha-editorial-finding-track"
            style={{
              transform: `translate3d(calc(-${safeActiveFinding} * (var(--finding-card) + var(--finding-gap))), 0, 0)`,
            }}
          >
            {slides.map((slide, index) => {
              const kicker = findingKicker(slide.index, slide.finding.checkId, slide.finding.tiedTo);
              const tone = findingTone(slide.finding);
              const verdictLabel = findingVerdictLabel(slide.finding.verdict);
              return (
                <article
                  key={slide.key}
                  className={`fha-editorial-finding-slide is-finding is-${tone}`}
                  aria-hidden={index !== safeActiveFinding}
                >
                  <header>
                    <span>{kicker}</span>
                    {verdictLabel ? (
                      <span className={`fha-editorial-severity is-${tone}`}>
                        {verdictLabel}
                      </span>
                    ) : null}
                  </header>
                  <strong>{renderNumericCopy(slide.finding.stat)}</strong>
                  <h3>{slide.finding.title}</h3>
                  <p>{renderNumericCopy(slide.finding.body)}</p>
                  <div className="fha-editorial-finding-fix">
                    <span>What fixing this takes</span>
                    {/* Reason: The saved recommendation owns its scope; appending a service promise added claims the evidence never established. */}
                    <p>{renderNumericCopy(slide.finding.fixNote)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorialReportView({
  report,
  path,
  capturedEmail,
  capturedFirstName,
  titleRef,
}: Omit<ReportViewProps, "report"> & { report: EditorialAuditReport }) {
  // Reason: Older persisted reports expose the same ordered six findings as
  // two three-item arrays. The lead gate now happens before generation, so the
  // renderer joins both transport shapes into one uninterrupted carousel.
  const findings = report.additionalFindings?.length
    ? [...report.findings, ...report.additionalFindings]
    : report.findings;
  const findingSlides = getEditorialFindingSlides(findings);
  const actionGroups = [
    { title: "This week", actions: report.actionPlan.thisWeek },
    { title: "This quarter", actions: report.actionPlan.thisQuarter },
  ];
  const reliabilityAreas = report.reliabilityAreas ?? [];
  const auditSnapshotDate = formatAuditSnapshotDate(report.asOfDate);

  const bookDemo = () => {
    track("financial_health_audit_cta_clicked", {
      path: path ?? "unknown",
      surface: "editorial_demo",
    });

    const calendlyUrl = new URL(FINANCIAL_HEALTH_REVIEW_URL);
    if (capturedFirstName?.trim()) calendlyUrl.searchParams.set("name", capturedFirstName.trim());
    if (capturedEmail?.trim()) calendlyUrl.searchParams.set("email", capturedEmail.trim().toLowerCase());
    calendlyUrl.searchParams.set("utm_source", "porter");
    calendlyUrl.searchParams.set("utm_medium", "website");
    calendlyUrl.searchParams.set("utm_campaign", "financial_health_audit");

    void openCalendlyPopup(calendlyUrl.toString());
  };

  return (
    <article className="fha-editorial-report">
      <header className="fha-editorial-hero">
        <div className="fha-editorial-container">
          <div className="fha-editorial-meta">
            <span>Financial health audit</span>
            <span>{report.reviewPeriod}</span>
            {/* Reason: The last surviving copy-rewriting helper on this page. Appending
                " basis" only reads correctly when the field holds a bare word like
                "accrual"; the output schema asks for a source label, so a real report
                rendered "Accrual basis; owner-uploaded summary document, no ledger or
                bank data basis" (live audit 659cbdd0, 2026-08-31). Authored text is
                displayed verbatim here like every other field. sourceLabel stays for
                legacy V1 reports that carry no reportingBasis at all. */}
            <span>{report.reportingBasis || sourceLabel(path)}</span>
          </div>
          <div className="fha-editorial-hero__copy">
            <p className="fha-editorial-section-mark">Audit complete</p>
            <h1 ref={titleRef} tabIndex={-1}>{renderNumericCopy(report.headline)}</h1>
            <p className="fha-editorial-summary">{renderNumericCopy(report.summary)}</p>
          </div>
        </div>
      </header>

      <EditorialFindingCarousel
        slides={findingSlides}
        sectionId="insights"
        eyebrow="Findings"
        title="What deserves your attention"
      />

      <section className="fha-editorial-actions" aria-labelledby="fha-editorial-actions-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">Next moves</p>
              <h2 id="fha-editorial-actions-title">What to do next</h2>
            </div>
          </div>
          <div className="fha-editorial-action-groups">
            {actionGroups.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h3>{group.title}</h3>
                <ol>
                  {group.actions.map((action, index) => (
                    <li key={`${group.title}-${action.title}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{action.title}</h4>
                        <p>{renderNumericCopy(action.body)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="fha-editorial-reliability" aria-labelledby="fha-editorial-reliability-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">How much to trust</p>
              <h2 id="fha-editorial-reliability-title">How much to trust this</h2>
            </div>
          </div>
          <p className="fha-editorial-reliability__note">{renderNumericCopy(report.reliabilityNote ?? "")}</p>
          {reliabilityAreas.length ? (
            <dl>
              {reliabilityAreas.map((area) => (
                <div key={area.label} className={`is-${area.status}`}>
                  <dt>{area.label}</dt>
                  <dd>{renderNumericCopy(area.note)}</dd>
                  <span aria-label={area.status}>{area.status}</span>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <footer className="fha-editorial-close">
        <div className="fha-editorial-container">
          <div>
            <p className="fha-editorial-section-mark">Your next step</p>
            <h2>Walk through these findings on your live books with us.</h2>
            <p>30 minutes, and you leave with a fix plan.</p>
            <div className="fha-editorial-close__buttons">
              {/* Reason: A completed audit is the immutable recovery target for
                  this email. Offering another run here would contradict the
                  Generate-to-recovery flow and create a duplicate report. */}
              <button type="button" className="fha-button fha-button--primary fha-button--large" onClick={bookDemo}>Walk through my findings</button>
            </div>
          </div>
          <p className="fha-editorial-close__snapshot">
            These numbers are from {auditSnapshotDate}. Your books have already changed. Porter watches them every day.
          </p>
        </div>
      </footer>
    </article>
  );
}

function sourceLabel(path: AuditPath | null): string {
  if (path === "connected") return "QuickBooks connected";
  if (path === "documents") return "Uploaded records";
  return "Owner estimates";
}

function findingKicker(index: number, checkId: string, tiedTo?: string | null): string {
  return `Finding ${String(index + 1).padStart(2, "0")} - ${findingCategoryLabel(checkId, tiedTo)}`;
}

function findingCategoryLabel(checkId: string, tiedTo?: string | null): string {
  const focusLabels: Record<string, string> = {
    books_health: "Books",
    cash_safety: "Liquidity",
    cash_flow: "Cash",
    growth: "Growth",
    collections: "Collections",
    payables: "Suppliers",
    costs: "Costs",
    profitability: "Profit",
    financing: "Financing",
  };
  if (tiedTo && focusLabels[tiedTo]) return focusLabels[tiedTo];

  const prefix = checkId.split("_")[0];
  const checkLabels: Record<string, string> = {
    B0: "Books",
    B1: "Books",
    B2: "Books",
    B3: "Books",
    B4: "Books",
    B5: "Books",
    B6: "Books",
    C1: "Liquidity",
    C2: "Collections",
    C3: "Suppliers",
    C4: "Cash",
    A1: "Activity",
    A2: "Activity",
    A3: "Activity",
    L1: "Leaks",
    L2: "Leaks",
    L3: "Leaks",
    P1: "Revenue",
    P2: "Profit",
    P3: "Profit",
    O1: "Costs",
    I0: "Context",
    I1: "Plan",
  };
  return checkLabels[prefix] ?? "Finding";
}

function formatAuditSnapshotDate(value?: string | null): string {
  const parts = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return "the day this audit ran";

  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const NUMBER_PATTERN = /\$\s?\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?|\d+(?:\.\d+)?\s?(?:%|pts?|days?|months?|weeks?|years?)|\d[\d,]*(?:\.\d+)?(?:[kKmMbB])?/g;

function renderNumericCopy(value: string): ReactNode {
  // Reason: The August 31 audit rounded financial ratios and rewrote claim qualifiers at display time.
  // The output contract owns readable prose; rendering only highlights numbers and preserves every character.
  const displayValue = value;
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
