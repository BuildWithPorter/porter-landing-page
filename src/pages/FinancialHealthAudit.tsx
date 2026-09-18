/* The public financial health audit page.
 *
 * POR-2226 split this file: every view it used to declare inline now lives in
 * src/components/financialHealthAudit/, and the stylesheet imported below is an
 * ordered barrel over per-area slices in that same directory. What is left here
 * is the routing: which view is mounted, for which screen, with which controller
 * state. Nothing on this page owns audit behaviour -- the state machine,
 * sessionStorage hydration, QuickBooks OAuth orchestration, document uploads and
 * report polling all live in useFinancialHealthAuditController, and
 * server/financialHealthAuditArchitecture.test.ts asserts that neither this file
 * nor any of the extracted components reaches for a QuickBooks transport.
 */
import { useEffect, useState } from "react";
import { Seo } from "../components/Seo";
import { MaterialIcon } from "../components/MaterialIcon";
import { AuditAside } from "../components/financialHealthAudit/AuditAside";
import { AuditFieldControl } from "../components/financialHealthAudit/AuditFieldControl";
import { AuditIntroduction } from "../components/financialHealthAudit/AuditIntroduction";
import { ContextField } from "../components/financialHealthAudit/ContextField";
import { DocumentUploadField } from "../components/financialHealthAudit/DocumentUploadField";
import { LeadCaptureView } from "../components/financialHealthAudit/LeadCaptureView";
import { ProgressRail } from "../components/financialHealthAudit/ProgressRail";
import { RecoveryAuthView } from "../components/financialHealthAudit/RecoveryAuthView";
import { ReportPendingView } from "../components/financialHealthAudit/ReportPendingView";
import { ReportView } from "../components/financialHealthAudit/ReportView";
import {
  EditorialReportPreview,
  LeadGatePreview,
  RecoveryCodePreview,
  ReportPendingPreview,
} from "../components/financialHealthAudit/devPreviews";
import {
  isEditorialPreview,
  isLeadGatePreview,
  isRecoveryCodePreview,
  isWaitingPreview,
} from "../components/financialHealthAudit/devPreviewRoute";
import { STEPS, FIRST_AUDIT_STEP } from "./financialHealthAuditFlow";
import { quickBooksStatus } from "./financialHealthAuditState";
import { trackFinancialHealthAudit, useFinancialHealthAuditController } from "./useFinancialHealthAuditController";
import "./FinancialHealthAudit.css";

const track = trackFinancialHealthAudit;

export function FinancialHealthAudit() {
  const waitingPreview = isWaitingPreview();
  const editorialPreview = isEditorialPreview();
  
  useEffect(() => {
    window.fbq?.("trackCustom", "AuditViewed");
  }, []);
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

function AuditExperience() {
  const controller = useFinancialHealthAuditController();
  // Reason: Explain the value before contact capture without adding an audit
  // lifecycle state or creating a prospect company merely for visiting a page.
  // Saved work, OAuth callbacks and access errors must retain their own screens.
  const [introductionDismissed, setIntroductionDismissed] = useState(false);
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
  const showIntroduction = !introductionDismissed &&
    (screen === "boot" || screen === "lead") &&
    !session.auditId && !session.capturedEmail &&
    !state.validationMessage && !state.callbackNotice;

  return (
    <main className="fha-main">
      {showIntroduction ? (
        <AuditIntroduction
          titleRef={titleRef}
          ready={screen === "lead"}
          onStart={() => {
            track("financial_health_audit_introduction_continued");
            setIntroductionDismissed(true);
          }}
        />
      ) : screen === "boot" ? null : screen === "recovery" && state.recovery.session ? (
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
                {step.id !== FIRST_AUDIT_STEP ? (
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
          (screen === "questionnaire" && session.stepId !== FIRST_AUDIT_STEP)) ? (
        <button type="button" className="fha-restart" onClick={() => {
          // Reason: Someone explicitly restarting already knows the audit;
          // preserve their direct path to clean contact capture.
          setIntroductionDismissed(true);
          actions.restart();
        }}>
          <MaterialIcon name="restart_alt" />
          {screen === "quickbooks-error" ? "Start new audit" : "Restart audit"}
        </button>
      ) : null}
    </main>
  );
}
