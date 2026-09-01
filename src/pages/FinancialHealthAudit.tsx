import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Calligraph } from "calligraph";
import { useReducedMotion } from "motion/react";
import posthog from "posthog-js";
import { Seo } from "../components/Seo";
import { MaterialIcon } from "../components/MaterialIcon";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import { openCalendlyPopup } from "../lib/calendly";
import {
  captureFinancialHealthAuditEmail,
  createFinancialHealthAudit,
  generateFinancialHealthAudit,
  getFinancialHealthAudit,
  listFinancialHealthAuditDocuments,
  preflightFinancialHealthAuditDocuments,
  requestFinancialHealthAuditRecovery,
  startFinancialHealthAuditEmailRecovery,
  startFinancialHealthQuickBooksConnection,
  uploadFinancialHealthAuditDocument,
  updateFinancialHealthAudit,
  verifyFinancialHealthAuditEmailRecovery,
  waitForFinancialHealthAudit,
  waitForFinancialHealthAuditDocuments,
  waitForFinancialHealthQuickBooksConnection,
  type AuditDocument,
  type AuditRemoteSession,
  type FinancialHealthAuditEmailChallenge,
  type QuickBooksConnectionStatus,
  type RecoveredFinancialHealthAudit,
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
  type NarratedFinding,
} from "./financialHealthAuditFlow";
import {
  leadCaptureDestination,
  normalizeStoredAuditLocation,
} from "./financialHealthAuditState";
import "./FinancialHealthAudit.css";

type AuditState = {
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
};

type ReportPhase = "idle" | "generating" | "error";
type ReportProgress = "saving" | "reading" | "analyzing";
type ReportRecovery = "retry" | "quickbooks";
type QuickBooksPhase = "idle" | "connecting" | "error";
type RecoverySession = {
  state: string;
  email: string;
};

const STORAGE_KEY = "porter-financial-health-audit-v2";
const LEGACY_STORAGE_KEY = "porter-financial-health-audit-v1";
const QUICKBOOKS_STARTED_AT_KEY = "porter-financial-health-audit-qbo-started-at";
const RECOVERY_SESSION_KEY = "porter-financial-health-audit-recovery";

function getFinancialHealthAuditReturnUrl(): string {
  // Reason: sessionStorage is origin-scoped. localhost and 127.0.0.1 are
  // different origins, so the Intuit return must land on the host that stored
  // the audit token or the callback cannot match this browser session.
  return new URL("/financial-health-audit", window.location.origin).toString();
}
const PORTER_APP_URL = "https://app.buildwithporter.com";

function getPorterAppBase(): string {
  const configuredApp = (import.meta.env.VITE_PORTER_APP_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  if (configuredApp) return configuredApp;
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (localHost) return "http://localhost:5173";
  if (
    window.location.hostname === "dev-landing.buildwithporter.com" ||
    window.location.hostname.startsWith("dev.")
  ) {
    return "https://dev.buildwithporter.com";
  }
  return PORTER_APP_URL;
}

function storedFinancialHealthAuditRecovery(): RecoverySession | null {
  try {
    const raw = window.sessionStorage.getItem(RECOVERY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecoverySession>;
    if (
      typeof parsed.state !== "string" ||
      parsed.state.length < 32 ||
      typeof parsed.email !== "string" ||
      !parsed.email.includes("@")
    ) {
      window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
      return null;
    }
    return { state: parsed.state, email: parsed.email };
  } catch {
    window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    return null;
  }
}
const FINANCIAL_HEALTH_REVIEW_URL = "https://calendly.com/daniel-buildwithporter/30min";
const MAX_AUDIT_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_AUDIT_DOCUMENTS = 50;
const MAX_AUDIT_DOCUMENT_TOTAL_BYTES = 200 * 1024 * 1024;
const AUDIT_DOCUMENT_UPLOAD_CONCURRENCY = 4;

const INITIAL_STATE: AuditState = {
  stepId: "business-type",
  path: null,
  answers: {},
  auditId: null,
  auditToken: null,
  companyName: null,
  report: null,
  capturedEmail: null,
  capturedFirstName: null,
  connectionStatus: "not_started",
};

function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  posthog.capture(event, properties);
}

function notifyFinancialHealthAuditReportStarted(
  submissionId: string,
  email: string,
  path: AuditPath,
) {
  // Reason: This operator notification specifically means generation started.
  // Keep it best-effort and call it only beside requestReport so repeat visitors
  // entering recovery are not mislabeled as new audit runs.
  void fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      // Reason: The audit id is already a stable UUID for this one generation
      // event, so browser retries/reloads cannot create a second email receipt.
      submission_id: submissionId,
      email,
      source: "financial_health_audit",
      action: "generate_report",
    }),
  })
    .then((response) => {
      if (!response.ok) {
        track("financial_health_audit_waitlist_notification_failed", {
          path,
          status: response.status,
        });
      }
    })
    .catch(() => {
      track("financial_health_audit_waitlist_notification_failed", {
        path,
        status: 0,
      });
    });
}

function upsertAuditDocument(documents: AuditDocument[], nextDocument: AuditDocument): AuditDocument[] {
  const index = documents.findIndex((document) => document.id === nextDocument.id);
  if (index === -1) return [...documents, nextDocument];
  const nextDocuments = [...documents];
  nextDocuments[index] = nextDocument;
  return nextDocuments;
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
    (candidate.auditId === undefined || candidate.auditId === null || typeof candidate.auditId === "string") &&
    (candidate.auditToken === undefined || candidate.auditToken === null || typeof candidate.auditToken === "string") &&
    (candidate.companyName === undefined || candidate.companyName === null || typeof candidate.companyName === "string") &&
    (candidate.report === undefined || candidate.report === null || isAuditReport(candidate.report)) &&
    (candidate.capturedEmail === undefined ||
      candidate.capturedEmail === null ||
      typeof candidate.capturedEmail === "string") &&
    (candidate.capturedFirstName === undefined ||
      candidate.capturedFirstName === null ||
      typeof candidate.capturedFirstName === "string") &&
    (candidate.connectionStatus === undefined ||
      candidate.connectionStatus === "not_started" ||
      candidate.connectionStatus === "pending" ||
      candidate.connectionStatus === "connected" ||
      candidate.connectionStatus === "failed")
  );
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
  invoices_guess: {
    "Nothing — customers pay upfront": "Nothing: customers pay upfront",
  },
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

function normalizeStoredState(value: AuditState): AuditState {
  const answers = normalizeStoredAnswers(value.answers);
  const { path, stepId } = normalizeStoredAuditLocation({
    answers,
    path: value.path,
    stepId: value.stepId,
    hasReport: Boolean(value.report),
  });
  return { ...value, answers, path, stepId };
}

function reconcileRemoteAuditState(
  stored: AuditState,
  remote: AuditRemoteSession,
): AuditState {
  const stepId = remote.stepId && remote.stepId in STEPS
    ? remote.stepId
    : stored.stepId;
  const path = remote.path === undefined ? stored.path : remote.path;
  const answers = remote.answers && typeof remote.answers === "object"
    ? remote.answers
    : stored.answers;
  return normalizeStoredState({
    ...stored,
    stepId,
    path,
    answers,
    report: remote.report ?? stored.report,
    companyName: remote.qboCompanyName ?? stored.companyName,
    capturedEmail: remote.capturedEmail ?? stored.capturedEmail,
    capturedFirstName: remote.capturedFirstName ?? stored.capturedFirstName,
    connectionStatus: remote.connectionStatus ?? stored.connectionStatus,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isNarratedFinding(value: unknown): value is NarratedFinding {
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

function isAuditActionPlan(value: unknown): value is NonNullable<AuditReport["actionPlan"]> {
  if (!isRecord(value)) return false;
  const validActions = (actions: unknown) => (
    Array.isArray(actions) &&
    actions.every((action) => (
      isRecord(action) &&
      typeof action.title === "string" &&
      typeof action.body === "string"
    ))
  );
  return validActions(value.thisWeek) && validActions(value.thisQuarter);
}

function isAuditReport(value: unknown): value is AuditReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditReport>;
  const findings = candidate.findings;
  const additionalFindings = candidate.additionalFindings;
  const reportEnvelope = (
    typeof candidate.title === "string" &&
    typeof candidate.lede === "string" &&
    (candidate.analysisSummary === undefined || typeof candidate.analysisSummary === "string") &&
    Array.isArray(findings) &&
    Array.isArray(candidate.actions) &&
    typeof candidate.confidenceTitle === "string" &&
    typeof candidate.confidenceBody === "string"
  );
  if (!reportEnvelope) return false;
  // Reason: POR-2051 retired the V1 report. The API only emits version 2, so a
  // version-1 payload here is a stale sessionStorage entry from before the
  // deploy. Reject it and let the visitor regenerate rather than shipping a
  // second renderer for a shape nothing produces any more.
  if (candidate.version !== 2) return false;
  return (
    typeof candidate.headline === "string" &&
    typeof candidate.reviewPeriod === "string" &&
    typeof candidate.summary === "string" &&
    findings.every(isNarratedFinding) &&
    (
      additionalFindings === undefined ||
      (Array.isArray(additionalFindings) && additionalFindings.every(isNarratedFinding))
    ) &&
    (
      (findings.length === 3 && additionalFindings?.length === 3) ||
      (findings.length === 6 && additionalFindings === undefined)
    ) &&
    isAuditActionPlan(candidate.actionPlan) &&
    typeof candidate.reliabilityNote === "string"
  );
}

function advancesOnChoice(step: AuditStep): boolean {
  // The audit-method cards are actions: each one starts its chosen path.
  // Every questionnaire choice remains editable until Continue is clicked.
  return step.id === "connect";
}

export function FinancialHealthAudit() {
  const waitingPreview = isWaitingPreview();
  const editorialPreview = isEditorialPreview();
  const leadGatePreview = isLeadGatePreview();
  const recoveryCodePreview = isRecoveryCodePreview();
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
    </WaitlistProvider>
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
        answers={{}}
        onCta={() => undefined}
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
        onRecovered={() => undefined}
        onBack={() => undefined}
        titleRef={titleRef}
      />
    </main>
  );
}

function recoveredAuditState(recovered: RecoveredFinancialHealthAudit): AuditState {
  // Reason: Verified recovery can resume the original unfinished company,
  // preserving ledger ownership rather than importing into another tenant.
  if (recovered.session) {
    return normalizeStoredState({
      ...INITIAL_STATE,
      ...recovered.session,
      auditId: recovered.id,
      auditToken: recovered.session.accessToken,
      capturedEmail: recovered.capturedEmail,
      capturedFirstName: recovered.capturedFirstName,
      companyName: recovered.session.qboCompanyName ?? null,
    });
  }
  const path = recovered.path ?? "unconnected";
  const reportStepId = FLOWS[path].find((stepId) => STEPS[stepId].kind === "report");
  if (!reportStepId) throw new Error("This report could not be displayed.");
  return {
    ...INITIAL_STATE,
    stepId: reportStepId,
    path,
    auditId: recovered.id,
    auditToken: null,
    report: recovered.report,
    capturedEmail: recovered.capturedEmail,
    capturedFirstName: recovered.capturedFirstName,
  };
}

function AuditExperience() {
  const [state, setState] = useState<AuditState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [reportPhase, setReportPhase] = useState<ReportPhase>("idle");
  const [reportProgress, setReportProgress] = useState<ReportProgress>("saving");
  const [reportThinking, setReportThinking] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportRecovery, setReportRecovery] = useState<ReportRecovery>("retry");
  const [quickBooksPhase, setQuickBooksPhase] = useState<QuickBooksPhase>("idle");
  const [quickBooksError, setQuickBooksError] = useState("");
  const [documents, setDocuments] = useState<AuditDocument[]>([]);
  const [documentError, setDocumentError] = useState("");
  const [documentUploadActive, setDocumentUploadActive] = useState(false);
  const [documentPreflightActive, setDocumentPreflightActive] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [recoverySession, setRecoverySession] = useState<RecoverySession | null>(null);
  const [recoveryError, setRecoveryError] = useState("");
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const auditIdRef = useRef<string | null>(null);
  const auditTokenRef = useRef<string | null>(null);
  const documentUploadActiveRef = useRef(false);
  const documentPreflightActiveRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const backgroundSaveTimerRef = useRef<number | null>(null);
  const quickBooksIntentRef = useRef(false);
  const quickBooksNavigationRef = useRef(false);
  const reportRequestActiveRef = useRef(false);
  const reportResumeRequestedRef = useRef(false);
  const reportAbortRef = useRef<AbortController | null>(null);
  const sessionGenerationRef = useRef(0);
  const stepEnteredAtRef = useRef(0);
  const { open: openWaitlist } = useWaitlist();

  useEffect(() => {
    documentUploadActiveRef.current = documentUploadActive;
  }, [documentUploadActive]);

  useEffect(() => {
    const savedRecovery = storedFinancialHealthAuditRecovery();
    const hydrationController = new AbortController();
    let cancelled = false;

    let restored: AuditState | null = null;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY)
        ?? window.sessionStorage.getItem(LEGACY_STORAGE_KEY);
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
        if (
          parsed &&
          typeof parsed === "object" &&
          "path" in parsed &&
          parsed.path === "connected" &&
          "stepId" in parsed &&
          parsed.stepId === "revenue-pattern"
        ) {
          parsed.stepId = "bookkeeping";
        }
        if (isAuditState(parsed)) {
          restored = normalizeStoredState({
            ...INITIAL_STATE,
            ...parsed,
            auditId: parsed.auditId ?? null,
            auditToken: parsed.auditToken ?? null,
            companyName: parsed.companyName ?? null,
            report: parsed.report ?? null,
          });
          if (
            STEPS[restored.stepId].kind === "report" &&
            !restored.report &&
            (!restored.auditId || !restored.auditToken)
          ) {
            // Reason: Pre-gate sessions can contain a report step without the
            // original browser bearer. Return to lead capture instead of trying
            // an impossible background report read.
            restored.stepId = "lead-capture";
          }
          window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        if (restored?.auditId && restored.auditToken) {
          const timeout = window.setTimeout(() => hydrationController.abort(), 5_000);
          try {
            const remote = await getFinancialHealthAudit(
              restored.auditId,
              restored.auditToken,
              hydrationController.signal,
            );
            restored = reconcileRemoteAuditState(restored, remote);
          } catch {
            // Keep the browser snapshot usable when the read-only resume check is
            // temporarily unavailable. The next refresh will reconcile it again.
          } finally {
            window.clearTimeout(timeout);
          }
        }
        if (cancelled) return;
        if (savedRecovery) {
          // Reason: Existing-report verification must remain on the landing
          // site. Restore only the report-scoped email challenge state so a
          // refresh cannot accidentally send the visitor into the Porter app.
          setRecoverySession(savedRecovery);
        }
        if (restored) {
          auditIdRef.current = restored.auditId;
          auditTokenRef.current = restored.auditToken;
          quickBooksIntentRef.current =
            restored.path === "connected" &&
            restored.answers.connection_choice === "quickbooks";
          setState(restored);
          if (STEPS[restored.stepId].kind === "report" && !restored.report) {
            // Reason: Generation is durable on Porter now. A page refresh should
            // reconnect to the running job instead of inviting a duplicate paid run.
            setReportPhase("generating");
            setReportProgress(restored.path === "documents" ? "reading" : "analyzing");
          }
        }
        setHydrated(true);
      })();
    }, 0);
    track("financial_health_audit_viewed");
    return () => {
      cancelled = true;
      hydrationController.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => () => {
    reportAbortRef.current?.abort();
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

      if (callbackStatus !== "processing" && callbackStatus !== "connected") {
        quickBooksIntentRef.current = false;
        quickBooksNavigationRef.current = false;
        setQuickBooksPhase("error");
        setQuickBooksError("QuickBooks was not connected. Try again or continue without it.");
        setState((current) => ({
          ...current,
          path: null,
          stepId: "connect",
          connectionStatus: "not_started",
        }));
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

      // Reason: A successful callback means Intuit authorization and the
      // bounded code exchange already completed. Ledger ingestion continues in
      // the API process, so the questionnaire can proceed while it runs.
      quickBooksIntentRef.current = true;
      quickBooksNavigationRef.current = false;
      setState((current) => ({
        ...current,
        path: "connected",
        stepId: "goal",
        connectionStatus: current.connectionStatus === "not_started"
          ? "pending"
          : current.connectionStatus,
      }));
      setQuickBooksPhase("idle");
      setQuickBooksError("");
      clearCallbackQuery();
      track("financial_health_audit_quickbooks_connected", {
        authorization_duration_ms: quickBooksAuthorizationDuration(),
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (
      !hydrated ||
      state.path !== "connected" ||
      !state.auditId ||
      !state.auditToken ||
      quickBooksError ||
      (state.connectionStatus !== "pending" && state.connectionStatus !== "failed")
    ) return;

    const controller = new AbortController();
    const sessionGeneration = sessionGenerationRef.current;
    const auditId = state.auditId;
    const auditToken = state.auditToken;
    void waitForFinancialHealthQuickBooksConnection(auditId, auditToken, controller.signal)
      .then((connection) => {
        if (sessionGeneration !== sessionGenerationRef.current) return;
        setQuickBooksPhase("idle");
        setQuickBooksError("");
        setState((current) => current.auditId === auditId
          ? {
              ...current,
              connectionStatus: connection.status,
              companyName: connection.companyName ?? current.companyName,
            }
          : current);
        track("financial_health_audit_quickbooks_import_completed");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (sessionGeneration !== sessionGenerationRef.current) return;
        const message = error instanceof Error
          ? error.message
          : "QuickBooks could not be imported. Reconnect QuickBooks and try again.";
        quickBooksNavigationRef.current = false;
        setQuickBooksPhase("error");
        setQuickBooksError(message);
        setState((current) => current.auditId === auditId
          ? { ...current, connectionStatus: "failed" }
          : current);
        track("financial_health_audit_quickbooks_import_failed");
      });

    return () => controller.abort();
  }, [
    hydrated,
    quickBooksError,
    state.auditId,
    state.auditToken,
    state.connectionStatus,
    state.path,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const enqueueSave = useCallback((snapshot: AuditState): Promise<{ id: string; token: string }> => {
    const sessionGeneration = sessionGenerationRef.current;
    let credential = { id: "", token: "" };
    const task = saveQueueRef.current.then(async () => {
      if (sessionGeneration !== sessionGenerationRef.current) {
        throw new DOMException("The audit session changed.", "AbortError");
      }
      // Once OAuth has been requested, connection intent is monotonic. A save
      // captured by an older render must never clear it while the browser is
      // leaving for Intuit or after it returns successfully.
      const persistableSnapshot = quickBooksIntentRef.current
        ? {
            ...snapshot,
            // Reason: A document upload can already be waiting in the save
            // queue when the sidebar starts OAuth. While the browser is
            // leaving for Intuit, rewrite that whole flow position to the QBO
            // handoff instead of preserving a stale document-upload step.
            stepId: quickBooksNavigationRef.current ? "connect" : snapshot.stepId,
            path: "connected" as const,
            answers: { ...snapshot.answers, connection_choice: "quickbooks" },
          }
        : snapshot;
      const payload = {
        stepId: persistableSnapshot.stepId,
        path: persistableSnapshot.path,
        answers: persistableSnapshot.answers,
        capturedEmail: persistableSnapshot.capturedEmail,
        capturedFirstName: persistableSnapshot.capturedFirstName,
      };
      const existingAuditId = auditIdRef.current;
      const existingAuditToken = auditTokenRef.current;
      const hadAuditCredential = Boolean(existingAuditId && existingAuditToken);
      const remote = existingAuditId && existingAuditToken
        ? await updateFinancialHealthAudit(existingAuditId, existingAuditToken, payload)
        : await createFinancialHealthAudit(payload);
      if (sessionGeneration !== sessionGenerationRef.current) {
        throw new DOMException("The audit session changed.", "AbortError");
      }
      const auditToken = remote.accessToken ?? auditTokenRef.current;
      if (!auditToken) throw new Error("Porter did not return an audit access token.");
      credential = { id: remote.id, token: auditToken };
      auditIdRef.current = remote.id;
      auditTokenRef.current = auditToken;
      const storedCapturedEmail = remote.capturedEmail ?? persistableSnapshot.capturedEmail ?? null;
      const storedCapturedFirstName = remote.capturedFirstName ?? persistableSnapshot.capturedFirstName ?? null;
      if (!hadAuditCredential && storedCapturedEmail) {
        // Reason: If explicit capture fails or the tab closes right after create,
        // the backend has already retained this email. Store it with the bearer
        // immediately so a reload cannot reuse that bearer with a blank or
        // different lead email.
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...persistableSnapshot,
            auditId: remote.id,
            auditToken,
            companyName: remote.qboCompanyName ?? persistableSnapshot.companyName,
            capturedEmail: storedCapturedEmail,
            capturedFirstName: storedCapturedFirstName,
          }),
        );
      }
      setState((current) => {
        const companyName = remote.qboCompanyName ?? current.companyName;
        const connectionStatus = remote.connectionStatus ?? current.connectionStatus;
        const capturedEmail = remote.capturedEmail ?? persistableSnapshot.capturedEmail ?? current.capturedEmail;
        const capturedFirstName = remote.capturedFirstName ?? persistableSnapshot.capturedFirstName ?? current.capturedFirstName;
        if (!hadAuditCredential && !current.capturedEmail && persistableSnapshot.capturedEmail) {
          return current;
        }
        return current.auditId === remote.id &&
          current.auditToken === auditToken &&
          current.companyName === companyName &&
          current.connectionStatus === connectionStatus &&
          current.capturedEmail === capturedEmail &&
          current.capturedFirstName === capturedFirstName
          ? current
          : {
              ...current,
              auditId: remote.id,
              auditToken,
              companyName,
              connectionStatus,
              capturedEmail,
              capturedFirstName,
            };
      });
    });
    saveQueueRef.current = task.catch(() => undefined);
    return task.then(() => credential);
  }, []);

  const refreshDocuments = useCallback(async () => {
    const sessionGeneration = sessionGenerationRef.current;
    const auditId = auditIdRef.current;
    const auditToken = auditTokenRef.current;
    if (!auditId || !auditToken) return;
    try {
      const nextDocuments = await listFinancialHealthAuditDocuments(auditId, auditToken);
      if (sessionGeneration !== sessionGenerationRef.current) return;
      setDocuments(nextDocuments);
      setDocumentError("");
    } catch (error) {
      if (sessionGeneration !== sessionGenerationRef.current) return;
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
      !state.capturedEmail ||
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

  useEffect(() => {
    if (state.connectionStatus !== "failed" || !quickBooksError) return;
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [quickBooksError, state.connectionStatus]);

  // Reason: No server session, upload or QBO connection exists before lead
  // capture. The gate also catches email-less sessions from older bundles.
  // Email is the only field asked for; requiring a name here would pin every
  // new visitor on the lead gate forever, since none is collected any more.
  const needsLead = !state.capturedEmail;
  const step = needsLead ? STEPS["lead-capture"] : STEPS[state.stepId];
  const flow = state.path ? FLOWS[state.path] : SHARED_FLOW;
  const quickBooksRecoveryActive = state.path === "connected" &&
    state.connectionStatus === "failed" &&
    Boolean(quickBooksError);
  const stepIndex = Math.max(0, flow.indexOf(state.stepId));
  const questionSteps = flow.filter((id) => {
    const kind = STEPS[id].kind;
    return kind !== "lead" && kind !== "report";
  });
  const report = step.kind === "report" ? state.report : null;
  const choiceAdvancesImmediately = advancesOnChoice(step);

  const setAnswer = (name: string, value: AnswerValue) => {
    const nextAnswers = { ...state.answers, [name]: value };
    for (const field of step.fields ?? []) {
      if (field.showIf && !fieldIsVisible(field, nextAnswers)) delete nextAnswers[field.name];
    }
    const nextState: AuditState = {
      ...state,
      path: name === "connection_choice" && (value === "questions" || value === "skip" || value === "documents") ? null : state.path,
      answers: nextAnswers,
    };
    setState(nextState);
    if (name === "connection_choice" && (value === "questions" || value === "skip" || value === "documents")) {
      quickBooksIntentRef.current = false;
      quickBooksNavigationRef.current = false;
      setQuickBooksPhase("idle");
      setQuickBooksError("");
    }
    setValidationMessage("");
    if (choiceAdvancesImmediately) void advance(nextState);
  };

  const uploadDocuments = async (files: FileList | File[]) => {
    const sessionGeneration = sessionGenerationRef.current;
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length || documentUploadActive || documentPreflightActiveRef.current) return;
    const oversizedFile = selectedFiles.find((file) => file.size > MAX_AUDIT_DOCUMENT_BYTES);
    if (oversizedFile) {
      setDocumentError(`${oversizedFile.name} is larger than the 50MB file limit.`);
      return;
    }
    if (documents.length + selectedFiles.length > MAX_AUDIT_DOCUMENTS) {
      setDocumentError(`A financial health audit can include up to ${MAX_AUDIT_DOCUMENTS} files.`);
      return;
    }
    const existingBytes = documents.reduce((total, document) => total + (document.sizeBytes ?? 0), 0);
    const selectedBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
    if (existingBytes + selectedBytes > MAX_AUDIT_DOCUMENT_TOTAL_BYTES) {
      setDocumentError("The files in this audit exceed the 200MB combined limit.");
      return;
    }
    setDocumentUploadActive(true);
    setDocumentError("");
    try {
      // Reason: A visitor may reach this screen before autosave fires. Creating
      // the audit synchronously makes every direct-upload target bind to the
      // same bearer-protected audit rather than a browser-only placeholder.
      const credential = await enqueueSave({ ...state, path: "documents", stepId: "document-upload" });
      if (sessionGeneration !== sessionGenerationRef.current) return;
      let completedUploads = 0;
      const settled: PromiseSettledResult<AuditDocument>[] = [];
      // Reason: A full 50-file selection must not open 50 simultaneous prepare,
      // Storage PUT, and finalize requests from one browser tab.
      for (let offset = 0; offset < selectedFiles.length; offset += AUDIT_DOCUMENT_UPLOAD_CONCURRENCY) {
        const batch = selectedFiles.slice(offset, offset + AUDIT_DOCUMENT_UPLOAD_CONCURRENCY);
        const batchResults = await Promise.allSettled(
          batch.map(async (file) => {
            const document = await uploadFinancialHealthAuditDocument(credential.id, credential.token, file);
            if (sessionGeneration === sessionGenerationRef.current) {
              completedUploads += 1;
              setDocuments((current) => upsertAuditDocument(current, document));
              setValidationMessage("");
            }
            return document;
          }),
        );
        settled.push(...batchResults);
      }
      const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      await refreshDocuments();
      if (sessionGeneration !== sessionGenerationRef.current) return;
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
        document_count: completedUploads,
      });
    } catch (error) {
      // Reason: enqueueSave/create can fail before any file is sent (wrong
      // proxy key, network). Without this, the dropzone looks unchanged and
      // the failure only shows in the console.
      if (sessionGeneration === sessionGenerationRef.current) {
        setDocumentError(
          error instanceof Error ? error.message : "We could not upload those files. Try them again.",
        );
      }
    } finally {
      if (sessionGeneration === sessionGenerationRef.current) setDocumentUploadActive(false);
    }
  };

  const requestReport = useCallback(async (snapshot: AuditState, reuseSavedAudit = false) => {
    if (reportRequestActiveRef.current) return;
    reportRequestActiveRef.current = true;
    reportAbortRef.current?.abort();
    const controller = new AbortController();
    const sessionGeneration = sessionGenerationRef.current;
    reportAbortRef.current = controller;
    const startedAt = Date.now();
    setReportPhase("generating");
    setReportProgress(snapshot.path === "documents" ? "reading" : "saving");
    setReportThinking("");
    setReportError("");
    setReportRecovery("retry");
    try {
      // A failed generation leaves the checkup beyond the editable lifecycle.
      // Retrying must reuse its bearer instead of replaying the final PATCH,
      // which the API correctly rejects once generation has begun.
      const credential = reuseSavedAudit
        ? { id: auditIdRef.current, token: auditTokenRef.current }
        : await enqueueSave(snapshot);
      if (!credential.id || !credential.token) {
        throw new Error("This audit cannot generate a report yet.");
      }
      // Reason: Notify at report start, not at the earlier contact capture step.
      if (snapshot.path && snapshot.capturedEmail) {
        notifyFinancialHealthAuditReportStarted(
          credential.id, snapshot.capturedEmail, snapshot.path,
        );
      }
      if (snapshot.path === "documents") {
        // Reason: The wait screen is the document pipeline. Generate locks the
        // audit and would drop files that are still uploading or extracting.
        setReportProgress("reading");
        await waitForFinancialHealthAuditDocuments(
          credential.id,
          credential.token,
          controller.signal,
          (nextDocuments) => {
            if (sessionGeneration === sessionGenerationRef.current) {
              setDocuments(nextDocuments);
            }
          },
          () => documentUploadActiveRef.current,
        );
      }
      if (snapshot.path === "connected") {
        // Reason: Importing the ordinary ledger can outlast the questionnaire.
        // Wait before starting the paid investigation, with the same cancel scope.
        setReportThinking("Importing your QuickBooks records");
        try {
          await waitForFinancialHealthQuickBooksConnection(
            credential.id,
            credential.token,
            controller.signal,
          );
        } catch (error) {
          if (sessionGeneration === sessionGenerationRef.current) {
            const message = error instanceof Error
              ? error.message
              : "QuickBooks could not be imported. Reconnect QuickBooks and try again.";
            setReportRecovery("quickbooks");
            setQuickBooksPhase("error");
            setQuickBooksError(message);
            setState((current) => ({ ...current, connectionStatus: "failed" }));
          }
          throw error;
        }
        if (sessionGeneration !== sessionGenerationRef.current) return;
        setReportThinking("");
      }
      setReportProgress("analyzing");
      const started = await generateFinancialHealthAudit(credential.id, credential.token);
      const remote = started.status === "completed" && started.report
        ? started
        : await waitForFinancialHealthAudit(
            credential.id,
            credential.token,
            controller.signal,
            (progress) => {
              if (sessionGeneration === sessionGenerationRef.current) {
                setReportThinking(progress.generationActivity ?? "");
              }
            },
          );
      if (sessionGeneration !== sessionGenerationRef.current) return;
      if (!remote.report) throw new Error("Porter did not return a report.");
      setState((current) => ({ ...current, auditId: remote.id, report: remote.report }));
      setReportPhase("idle");
      track("financial_health_audit_report_generated", {
        path: snapshot.path ?? "unknown",
        duration_ms: Date.now() - startedAt,
      });
    } catch (error) {
      if (sessionGeneration !== sessionGenerationRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
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
    } finally {
      if (sessionGeneration === sessionGenerationRef.current) {
        reportRequestActiveRef.current = false;
        if (reportAbortRef.current === controller) reportAbortRef.current = null;
      }
    }
  }, [enqueueSave]);


  useEffect(() => {
    if (
      !hydrated ||
      reportPhase !== "generating" ||
      state.report ||
      STEPS[state.stepId].kind !== "report" ||
      !state.auditId ||
      !state.auditToken ||
      reportRequestActiveRef.current ||
      reportResumeRequestedRef.current
    ) return;
    reportResumeRequestedRef.current = true;
    void requestReport(state, true);
  }, [hydrated, reportPhase, requestReport, state]);

  const connectQuickBooks = async (snapshot: AuditState = state) => {
    const sessionGeneration = sessionGenerationRef.current;
    setQuickBooksError("");
    let authorizationIssued = false;
    try {
      const credential = await enqueueSave(snapshot);
      if (sessionGeneration !== sessionGenerationRef.current) return;
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
        getFinancialHealthAuditReturnUrl(),
      );
      if (sessionGeneration !== sessionGenerationRef.current) return;
      window.sessionStorage.setItem(QUICKBOOKS_STARTED_AT_KEY, String(Date.now()));
      // Reason: a null authUrl means the server resumed an import that already
      // had a linked realm and working credentials -- a worker we killed, not a
      // connection the visitor lost. Sending them through Intuit again to
      // recover from our own restart is charging them for our crash, so stay put
      // and let the existing wait pick the import back up.
      if (!connection.authUrl) {
        quickBooksNavigationRef.current = false;
        setState((current) => ({ ...current, connectionStatus: "pending" }));
        track("financial_health_audit_quickbooks_import_resumed");
        return;
      }
      authorizationIssued = true;
      track("financial_health_audit_quickbooks_authorization_started", {
        step_duration_ms: Date.now() - stepEnteredAtRef.current,
      });
      window.location.assign(connection.authUrl);
    } catch (error) {
      if (sessionGeneration !== sessionGenerationRef.current) return;
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
    setQuickBooksPhase("connecting");
    setQuickBooksError("");
    const snapshot: AuditState = {
      ...state,
      path: "connected",
      stepId: "connect",
      report: null,
      connectionStatus: "not_started",
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
    // Reason: The sidebar action can run from the document flow. Replace the
    // live state before any upload completion or credential save causes a new
    // render, so session storage and every subsequent effect see QBO as the
    // selected source of truth.
    setState(snapshot);
    setValidationMessage("");
    track("financial_health_audit_step_completed", {
      step_id: "connect",
      path: "connected",
      duration_ms: Date.now() - stepEnteredAtRef.current,
    });
    track("financial_health_audit_connection_selected", { selection: "uses_quickbooks" });
    void connectQuickBooks(snapshot);
  };

  async function advance(snapshot: AuditState) {
    if (!canContinue(step, snapshot.answers)) {
      const missingRequiredText = step.fields?.some(
        (field) =>
          field.type === "textarea" &&
          field.required === true &&
          fieldIsVisible(field, snapshot.answers) &&
          !String(snapshot.answers[field.name] ?? "").trim(),
      );
      setValidationMessage(missingRequiredText ? "Add a little detail to continue." : "Choose an answer to continue.");
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
      if (documentPreflightActiveRef.current) return;
      const sessionGeneration = sessionGenerationRef.current;
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
      documentPreflightActiveRef.current = true;
      setDocumentPreflightActive(true);
      setDocumentError("");
      setValidationMessage("Porter is checking whether these files can support your report.");
      try {
        // Reason: Confirm that extraction produced readable evidence before
        // leaving upload; financial sufficiency belongs to the shared audit skill.
        const credential = await enqueueSave({
          ...snapshot,
          path: "documents",
          stepId: "document-upload",
        });
        await waitForFinancialHealthAuditDocuments(
          credential.id,
          credential.token,
          undefined,
          setDocuments,
          () => documentUploadActiveRef.current,
        );
        if (sessionGeneration !== sessionGenerationRef.current) return;
        const preflight = await preflightFinancialHealthAuditDocuments(
          credential.id,
          credential.token,
        );
        if (sessionGeneration !== sessionGenerationRef.current) return;
        if (!preflight.eligible) {
          setDocumentError(preflight.message);
          setValidationMessage("");
          track("financial_health_audit_documents_preflight_failed");
          return;
        }
      } catch (error) {
        setDocumentError(
          error instanceof Error
            ? error.message
            : "Porter could not check these files. Try again.",
        );
        setValidationMessage("");
        return;
      } finally {
        documentPreflightActiveRef.current = false;
        setDocumentPreflightActive(false);
      }
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
    if (
      snapshot.path === "documents" &&
      STEPS[nextId].kind === "report" &&
      !documents.length &&
      !documentUploadActive
    ) {
      setValidationMessage("Upload at least one financial file for a document-backed audit.");
      return;
    }
    const nextState = { ...snapshot, stepId: nextId, report: null };
    setState(nextState);
    if (STEPS[nextId].kind === "report") {
      void requestReport(nextState);
    }
  }

  const next = () => void advance(state);

  const back = () => {
    const activeFlow = state.path ? FLOWS[state.path] : SHARED_FLOW;
    const index = activeFlow.indexOf(state.stepId);
    if (index <= 0) return;
    const previousId = activeFlow[index - 1];
    setState((current) => ({ ...current, stepId: previousId }));
    setValidationMessage("");
  };

  const restart = () => {
    sessionGenerationRef.current += 1;
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    window.sessionStorage.removeItem(QUICKBOOKS_STARTED_AT_KEY);
    window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    reportAbortRef.current?.abort();
    reportAbortRef.current = null;
    auditIdRef.current = null;
    auditTokenRef.current = null;
    saveQueueRef.current = Promise.resolve();
    if (backgroundSaveTimerRef.current !== null) {
      window.clearTimeout(backgroundSaveTimerRef.current);
      backgroundSaveTimerRef.current = null;
    }
    quickBooksIntentRef.current = false;
    quickBooksNavigationRef.current = false;
    reportRequestActiveRef.current = false;
    reportResumeRequestedRef.current = false;
    documentPreflightActiveRef.current = false;
    setState(INITIAL_STATE);
    setDocuments([]);
    setDocumentError("");
    setDocumentUploadActive(false);
    setDocumentPreflightActive(false);
    setReportPhase("idle");
    setReportProgress("saving");
    setReportThinking("");
    setReportError("");
    setReportRecovery("retry");
    setQuickBooksPhase("idle");
    setQuickBooksError("");
    setValidationMessage("");
    setRecoverySession(null);
    setRecoveryError("");
    track("financial_health_audit_restarted");
  };

  const openCta = () => {
    track("financial_health_audit_cta_clicked", { path: state.path ?? "unknown" });
    if (state.report && state.capturedEmail && !state.auditToken) {
      // Reason: A recovered report has already passed Porter authentication.
      // Continue into that same app session without manufacturing a bearer.
      window.location.assign(getPorterAppBase());
      return;
    }
    if (!state.auditId || !state.auditToken || !state.capturedEmail) {
      openWaitlist();
      return;
    }
    // Reason: The bearer stays in the URL fragment, which browsers do not send
    // to either server. Porter captures and scrubs it before starting auth.
    const handoff = new URL("/claim-financial-health-audit", getPorterAppBase());
    handoff.hash = new URLSearchParams({
      auditId: state.auditId,
      auditToken: state.auditToken,
    }).toString();
    window.location.assign(handoff.toString());
  };

  const beginAudit = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // Reason: The final answer may still be in the debounced save queue. Make
    // the completed intake durable before capturing the claim identity, then
    // persist the report step before generation locks further edits.
    // Reason: Contact capture is the first server write, before any financial data.
    const credential = await enqueueSave({ ...state, capturedEmail: normalizedEmail });
    const captured = await captureFinancialHealthAuditEmail(
      credential.id,
      credential.token,
      normalizedEmail,
    );
    if (leadCaptureDestination(captured.recoveryAvailable) === "recovery") {
      // Reason: Generate is the only CTA. A matching completed report opens
      // the existing email-proof screen automatically instead of asking the
      // visitor to choose between generation and recovery.
      const recovery = await requestFinancialHealthAuditRecovery(
        credential.id,
        credential.token,
      );
      const nextRecovery = { state: recovery.state, email: normalizedEmail };
      window.sessionStorage.setItem(RECOVERY_SESSION_KEY, JSON.stringify(nextRecovery));
      setRecoverySession(nextRecovery);
      setRecoveryError("");
      track("financial_health_audit_recovery_required", { path: state.path });
      return;
    }
    const nextState: AuditState = {
      ...state,
      stepId: "business-type",
      auditId: credential.id,
      auditToken: credential.token,
      capturedEmail: captured.capturedEmail ?? normalizedEmail,
      // Reason: nothing is collected here any more, but a retained prospect may
      // already have a name from an earlier visit -- keep whatever came back.
      capturedFirstName: captured.capturedFirstName ?? null,
      report: null,
    };
    await enqueueSave(nextState);
    setState(nextState);
    track("financial_health_audit_lead_captured", { path: state.path });
  };

  return (
    <main className="fha-main">
      {!hydrated ? null : recoverySession ? (
        <RecoveryAuthView
          email={recoverySession.email}
          initialError={recoveryError}
          titleRef={titleRef}
          onBack={() => {
            window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
            setRecoverySession(null);
            setRecoveryError("");
          }}
          onStartEmail={() => startFinancialHealthAuditEmailRecovery(recoverySession.state)}
          onVerifyEmail={verifyFinancialHealthAuditEmailRecovery}
          onRecovered={(recovered) => {
            const recoveredState = recoveredAuditState(recovered);
            // Reason: Subsequent saves and QBO callbacks must use the recovered
            // company's bearer, never the lead-only shell created on this visit.
            sessionGenerationRef.current += 1;
            // Reason: Recovery can reopen an unfinished report without a page
            // reload. Cancel the superseded request and restore the same resume
            // transition used by session hydration, using only the new bearer.
            reportAbortRef.current?.abort();
            reportAbortRef.current = null;
            reportRequestActiveRef.current = false;
            reportResumeRequestedRef.current = false;
            auditIdRef.current = recoveredState.auditId;
            auditTokenRef.current = recoveredState.auditToken;
            quickBooksIntentRef.current = recoveredState.path === "connected";
            setReportError("");
            setReportThinking("");
            setReportPhase(STEPS[recoveredState.stepId].kind === "report" && !recoveredState.report ? "generating" : "idle");
            setReportProgress(recoveredState.path === "documents" ? "reading" : "analyzing");
            window.sessionStorage.removeItem(STORAGE_KEY);
            window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
            window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
            setState(recoveredState);
            setRecoverySession(null);
            setRecoveryError("");
            setHydrated(true);
            track("financial_health_audit_recovered", {
              path: recoveredState.path,
              method: "email_code",
            });
          }}
        />
      ) : quickBooksRecoveryActive ? (
        <ReportPendingView
          phase="error"
          error={quickBooksError}
          recovery="quickbooks"
          onRetry={() => undefined}
          onReconnectQuickBooks={startQuickBooksFromChoice}
          onSignIn={() => window.location.assign(getPorterAppBase())}
          onBack={back}
          titleRef={titleRef}
          progress="saving"
          queuePosition={null}
          estimatedWaitSeconds={null}
          thinkingText=""
          documents={[]}
          uploadActive={false}
        />
      ) : report ? (
        <ReportView
          report={report}
          path={state.path}
          answers={state.answers}
          onCta={openCta}
          capturedEmail={state.capturedEmail}
          capturedFirstName={state.capturedFirstName}
          titleRef={titleRef}
        />
      ) : step.kind === "lead" ? (
        <LeadCaptureView
          onSubmit={beginAudit}
          onBack={back}
          titleRef={titleRef}
        />
      ) : step.kind === "report" ? (
        <ReportPendingView
          phase={reportPhase}
          error={reportError}
          recovery={reportRecovery}
          onRetry={() => void requestReport(state, true)}
          onReconnectQuickBooks={startQuickBooksFromChoice}
          onSignIn={() => window.location.assign(getPorterAppBase())}
          onBack={back}
          titleRef={titleRef}
          progress={reportProgress}
          queuePosition={null}
          estimatedWaitSeconds={null}
          thinkingText={reportThinking}
          documents={state.path === "documents" ? documents : []}
          uploadActive={state.path === "documents" && documentUploadActive}
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
                <ContextField answers={state.answers} setAnswer={setAnswer} />
              ) : step.kind === "documents" ? (
                <DocumentUploadField
                  documents={documents}
                  error={documentError}
                  uploading={documentUploadActive}
                  checking={documentPreflightActive}
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
                  <button
                    type="button"
                    className="fha-button fha-button--quiet"
                    onClick={back}
                    disabled={documentPreflightActive}
                  >Back</button>
                ) : <span />}
              </div>
              <div className="fha-card__advance">
                <>
                  <p id="fha-validation" className="fha-validation" aria-live="polite">{validationMessage}</p>
                  {!choiceAdvancesImmediately && (step.id !== "connect" || state.answers.connection_choice === "questions" || state.answers.connection_choice === "skip" || state.answers.connection_choice === "documents") ? (
                    <button
                      type="button"
                      className="fha-button fha-button--primary"
                      onClick={next}
                      disabled={documentPreflightActive}
                    >
                      {documentPreflightActive
                        ? "Checking files..."
                        : step.id === "connect"
                        ? state.answers.connection_choice === "documents"
                          ? "Upload documents"
                          : "Answer a few questions"
                        : STEPS[flow[stepIndex + 1]]?.kind === "report"
                          ? "See my report"
                          : "Continue"}
                      <MaterialIcon name="arrow_forward" />
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
            connectedPath={state.path === "connected"}
            quickBooksConnectionStatus={state.connectionStatus}
          />
        </div>
      )}

      {hydrated && (quickBooksRecoveryActive ||
        (state.stepId !== "business-type" && step.kind !== "report")) ? (
        <button type="button" className="fha-restart" onClick={restart}>
          <MaterialIcon name="restart_alt" />
          {quickBooksRecoveryActive ? "Start new audit" : "Restart audit"}
        </button>
      ) : null}

    </main>
  );
}

function LeadCaptureView({
  onSubmit,
  titleRef,
}: {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

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
          {status === "error" ? <p className="fha-lead-gate__error" role="alert">{error}</p> : null}
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
  onRecovered,
  onBack,
  titleRef,
}: {
  email: string;
  initialError: string;
  initialChallenge?: FinancialHealthAuditEmailChallenge;
  onStartEmail: () => Promise<FinancialHealthAuditEmailChallenge>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<RecoveredFinancialHealthAudit>;
  onRecovered: (recovered: RecoveredFinancialHealthAudit) => void;
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
      const recovered = await onVerifyEmail(challenge.challengeId, code);
      onRecovered(recovered);
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
                <>Enter the 6-digit code sent to <strong>{email}</strong>.</>
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
  answers: AuditAnswers;
  onCta: () => void;
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
