import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Calligraph } from "calligraph";
import { useReducedMotion } from "motion/react";
import posthog from "posthog-js";
import { Seo } from "../components/Seo";
import { MaterialIcon } from "../components/MaterialIcon";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import {
  captureFinancialHealthAuditEmail,
  createFinancialHealthAudit,
  generateFinancialHealthAudit,
  generateFinancialHealthAuditDeepReview,
  listFinancialHealthAuditDocuments,
  startFinancialHealthQuickBooksConnection,
  uploadFinancialHealthAuditDocument,
  updateFinancialHealthAudit,
  waitForFinancialHealthAudit,
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
  type NarratedFinding,
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
  companyName: string | null;
  report: AuditReport | null;
  capturedEmail: string | null;
};

type ReportPhase = "idle" | "generating" | "error";
type ReportProgress = "saving" | "analyzing";
type DeepReviewPhase = "idle" | "generating" | "error";
type QuickBooksPhase = "idle" | "connecting" | "error";

const STORAGE_KEY = "porter-financial-health-audit-v2";
const LEGACY_STORAGE_KEY = "porter-financial-health-audit-v1";
const QUICKBOOKS_STARTED_AT_KEY = "porter-financial-health-audit-qbo-started-at";

function getFinancialHealthAuditReturnUrl(): string {
  // Reason: sessionStorage is origin-scoped. localhost and 127.0.0.1 are
  // different origins, so the Intuit return must land on the host that stored
  // the audit token or the callback cannot match this browser session.
  return new URL("/financial-health-audit", window.location.origin).toString();
}
const PORTER_APP_URL = "https://app.buildwithporter.com";
const MAX_AUDIT_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_AUDIT_DOCUMENTS = 8;
const MAX_AUDIT_DOCUMENT_TOTAL_BYTES = 200 * 1024 * 1024;

const INITIAL_STATE: AuditState = {
  stepId: "business-type",
  path: null,
  answers: {},
  contextMode: "url",
  auditId: null,
  auditToken: null,
  companyName: null,
  report: null,
  capturedEmail: null,
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
    (candidate.companyName === undefined || candidate.companyName === null || typeof candidate.companyName === "string") &&
    (candidate.report === undefined || candidate.report === null || isAuditReport(candidate.report)) &&
    (candidate.capturedEmail === undefined ||
      candidate.capturedEmail === null ||
      typeof candidate.capturedEmail === "string")
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
  "website_url",
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
  const selectedConnection = answers.connection_choice;
  const path = selectedConnection === "quickbooks"
    ? "connected"
    : selectedConnection === "documents"
      ? "documents"
      : selectedConnection === "questions"
        ? "unconnected"
        : null;
  const flow = path ? FLOWS[path] : SHARED_FLOW;
  let stepId = flow.includes(value.stepId) ? value.stepId : flow[0];
  if (!value.report) {
    const currentIndex = Math.max(0, flow.indexOf(stepId));
    const firstIncomplete = flow
      .slice(0, currentIndex + 1)
      .find((candidate) => !canContinue(STEPS[candidate], answers));
    if (firstIncomplete) stepId = firstIncomplete;
  }
  return { ...value, answers, path, stepId };
}

function isAuditReport(value: unknown): value is AuditReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuditReport>;
  const legacyEnvelope = (
    typeof candidate.title === "string" &&
    typeof candidate.lede === "string" &&
    (candidate.analysisSummary === undefined || typeof candidate.analysisSummary === "string") &&
    Array.isArray(candidate.findings) &&
    (candidate.deepFindings === undefined || Array.isArray(candidate.deepFindings)) &&
    Array.isArray(candidate.actions) &&
    typeof candidate.confidenceTitle === "string" &&
    typeof candidate.confidenceBody === "string"
  );
  if (!legacyEnvelope) return false;
  if (candidate.version !== 2) return true;
  return (
    typeof candidate.headline === "string" &&
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.keyMetrics) &&
    Array.isArray(candidate.lockedFindings) &&
    Boolean(candidate.actionPlan && typeof candidate.actionPlan === "object") &&
    Array.isArray(candidate.reliabilityAreas)
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
        {waitingPreview ? <ReportPendingPreview /> : editorialPreview ? <EditorialReportPreview /> : <AuditExperience />}
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

const EDITORIAL_REPORT_PREVIEW: AuditReport = {
  version: 2,
  eyebrow: "Audit complete",
  title: "Three things worth your attention.",
  lede: "Cash is tighter than your hiring plan allows",
  analysisSummary: "",
  findings: [
    {
      checkId: "B1_last_entry",
      statFactId: "B1_last_entry",
      stat: "35 days",
      title: "Your books are behind",
      body: "The newest recorded transaction is 35 days old, so every cash and profit figure is as of what’s recorded. Bring in recent bank activity before you commit to another hire.",
      severity: "high",
      tiedTo: "books_health",
    },
    {
      checkId: "C1_cash_safety",
      statFactId: "C1_cash",
      stat: "$18,240",
      title: "Cash has little breathing room",
      body: "Recorded cash is only slightly above the near-term bills in QuickBooks. That leaves less room for the hiring plan you selected.",
      severity: "high",
      tiedTo: "cash_safety",
    },
    {
      checkId: "C2_receivables_aging",
      statFactId: "C2_overdue",
      stat: "$12,680",
      title: "Customer payments are running late",
      body: "A meaningful share of the money customers owe is already past due. Collecting the oldest balances would create room before adding payroll.",
      severity: "medium",
      tiedTo: "collections",
    },
    {
      checkId: "P2_net_income",
      statFactId: "P2_net_income",
      stat: "$6,420",
      title: "Profit remains positive",
      body: "The review period still shows a profit as of what’s recorded. The stale books mean that result should be confirmed before it supports a hiring decision.",
      severity: "info",
      tiedTo: "growth",
    },
  ],
  deepFindings: [],
  confidenceTitle: "",
  confidenceBody: "",
  actions: [],
  headline: "Cash is tighter than your hiring plan allows",
  summary: "Your books are more than a month behind, which makes the current cash and profit picture provisional. Recorded cash is only modestly above near-term bills, while customer payments past due could improve that position. Before hiring, update the books and collect the oldest balances. Those two moves will tell you whether the plan is actually affordable.",
  lockedFindings: [
    { checkId: "O1_expense_direction", title: "Monthly costs moved higher", teaser: "A recent cost shift may be narrowing your room" },
    { checkId: "C3_payables_aging", title: "Vendor timing needs attention", teaser: "Older bills could affect the next cash decision" },
    { checkId: "B2_uncategorized_activity", title: "Some activity needs cleanup", teaser: "Placeholder categories may hide where money went" },
  ],
  actionPlan: {
    thisWeek: [
      { title: "Bring the books current", body: "Match the newest bank activity and confirm that every sale and bill is recorded.", basedOnCheckIds: ["B1_last_entry"] },
      { title: "Call on the oldest balances", body: "Start with the customer balances that are furthest past due and assign each follow-up.", basedOnCheckIds: ["C2_receivables_aging"] },
    ],
    thisQuarter: [
      { title: "Set a weekly cash floor", body: "Choose the minimum bank balance the business will protect before approving new spending.", basedOnCheckIds: ["C1_cash_safety"] },
    ],
  },
  keyMetrics: [
    { label: "Cash in bank", value: "$18,240", context: "As of what’s recorded", tone: "caution" },
    { label: "Profit in review period", value: "$6,420", context: "As of what’s recorded", tone: "positive" },
    { label: "Customer payments past due", value: "$12,680", context: "From the aging report", tone: "caution" },
    { label: "Vendor bills past due", value: "$4,120", context: "From the aging report", tone: "caution" },
  ],
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
  reliabilityAreas: [
    { label: "Requested QuickBooks reports", status: "good", note: "All requested report sections returned." },
    { label: "Book freshness", status: "gap", note: "The latest recorded transaction was 35 days before the audit date." },
    { label: "Recent transaction detail", status: "good", note: "All transactions in the bounded recent window were available." },
  ],
  evidencePeriod: "2026-08",
  scopeNote: "",
  asOfDate: "2026-08-14",
  reportingBasis: "accrual",
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
        onRestart={() => undefined}
        onCta={() => undefined}
        onCaptureEmail={async () => undefined}
        titleRef={titleRef}
        deepReviewPhase="idle"
        onRetryDeepReview={async () => undefined}
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
        onRetry={() => undefined}
        onBack={() => undefined}
        titleRef={titleRef}
      />
    </main>
  );
}

function AuditExperience() {
  const [state, setState] = useState<AuditState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [reportPhase, setReportPhase] = useState<ReportPhase>("idle");
  const [reportProgress, setReportProgress] = useState<ReportProgress>("saving");
  const [reportThinking, setReportThinking] = useState("");
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
  const reportRequestActiveRef = useRef(false);
  const reportResumeRequestedRef = useRef(false);
  const reportAbortRef = useRef<AbortController | null>(null);
  const deepReviewAbortRef = useRef<AbortController | null>(null);
  const sessionGenerationRef = useRef(0);
  const stepEnteredAtRef = useRef(0);
  const { open: openWaitlist } = useWaitlist();

  useEffect(() => {
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
          window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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
          // Reason: Generation is durable on Porter now. A page refresh should
          // reconnect to the running job instead of inviting a duplicate paid run.
          setReportPhase("generating");
          setReportProgress("analyzing");
        }
      }
      setHydrated(true);
    }, 0);
    track("financial_health_audit_viewed");
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    reportAbortRef.current?.abort();
    deepReviewAbortRef.current?.abort();
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

      // Reason: A successful callback means Intuit authorization and the
      // bounded code exchange already completed. Report reads continue in the
      // API process, so the questionnaire must not wait for that snapshot.
      quickBooksIntentRef.current = true;
      quickBooksNavigationRef.current = false;
      setState((current) => ({
        ...current,
        path: "connected",
        stepId: "goal",
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
      };
      const remote = auditIdRef.current && auditTokenRef.current
        ? await updateFinancialHealthAudit(auditIdRef.current, auditTokenRef.current, payload)
        : await createFinancialHealthAudit(payload);
      if (sessionGeneration !== sessionGenerationRef.current) {
        throw new DOMException("The audit session changed.", "AbortError");
      }
      const auditToken = remote.accessToken ?? auditTokenRef.current;
      if (!auditToken) throw new Error("Porter did not return an audit access token.");
      credential = { id: remote.id, token: auditToken };
      auditIdRef.current = remote.id;
      auditTokenRef.current = auditToken;
      setState((current) => {
        const companyName = remote.qboCompanyName ?? current.companyName;
        return current.auditId === remote.id &&
          current.auditToken === auditToken &&
          current.companyName === companyName
          ? current
          : { ...current, auditId: remote.id, auditToken, companyName };
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
    if (choiceAdvancesImmediately) advance(nextState);
  };

  const uploadDocuments = async (files: FileList | File[]) => {
    const sessionGeneration = sessionGenerationRef.current;
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length || documentUploadActive) return;
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
      const settled = await Promise.allSettled(
        selectedFiles.map((file) => uploadFinancialHealthAuditDocument(credential.id, credential.token, file)),
      );
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
        document_count: selectedFiles.length - failures.length,
      });
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
    setReportProgress("saving");
    setReportThinking("");
    setReportError("");
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
      setReportProgress("analyzing");
      const started = await generateFinancialHealthAudit(credential.id, credential.token);
      const remote = started.status === "completed" && started.report
        ? started
        : await waitForFinancialHealthAudit(
            credential.id,
            credential.token,
            "core",
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

  const requestDeepReview = useCallback(async () => {
    const auditId = auditIdRef.current;
    const auditToken = auditTokenRef.current;
    if (
      !auditId ||
      !auditToken ||
      deepReviewRequestedRef.current ||
      state.report?.deepFindings?.length
    ) return;
    deepReviewRequestedRef.current = true;
    deepReviewAbortRef.current?.abort();
    const controller = new AbortController();
    const sessionGeneration = sessionGenerationRef.current;
    deepReviewAbortRef.current = controller;
    setDeepReviewPhase("generating");
    try {
      const started = await generateFinancialHealthAuditDeepReview(auditId, auditToken);
      const remote = started.deepGenerationStatus === "completed"
        ? started
        : await waitForFinancialHealthAudit(
            auditId,
            auditToken,
            "deep",
            controller.signal,
          );
      if (sessionGeneration !== sessionGenerationRef.current) return;
      if (!remote.report) throw new Error("Porter did not return the deeper review.");
      setState((current) => ({ ...current, report: remote.report }));
      setDeepReviewPhase("idle");
      track("financial_health_audit_deep_review_generated", {
        path: state.path ?? "unknown",
      });
    } catch (error) {
      if (sessionGeneration !== sessionGenerationRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Reason: The useful three-check report remains complete even when this
      // background pass fails. Let the visitor retry the deeper review without
      // discarding the audit or resubmitting their email.
      deepReviewRequestedRef.current = false;
      setDeepReviewPhase("error");
    } finally {
      if (
        sessionGeneration === sessionGenerationRef.current &&
        deepReviewAbortRef.current === controller
      ) {
        deepReviewAbortRef.current = null;
      }
    }
  }, [state.path, state.report?.deepFindings?.length]);

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
      authorizationIssued = true;
      window.sessionStorage.setItem(QUICKBOOKS_STARTED_AT_KEY, String(Date.now()));
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

  function advance(snapshot: AuditState) {
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
    sessionGenerationRef.current += 1;
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    window.sessionStorage.removeItem(QUICKBOOKS_STARTED_AT_KEY);
    reportAbortRef.current?.abort();
    deepReviewAbortRef.current?.abort();
    reportAbortRef.current = null;
    deepReviewAbortRef.current = null;
    auditIdRef.current = null;
    auditTokenRef.current = null;
    saveQueueRef.current = Promise.resolve();
    if (backgroundSaveTimerRef.current !== null) {
      window.clearTimeout(backgroundSaveTimerRef.current);
      backgroundSaveTimerRef.current = null;
    }
    quickBooksIntentRef.current = false;
    quickBooksNavigationRef.current = false;
    deepReviewRequestedRef.current = false;
    reportRequestActiveRef.current = false;
    reportResumeRequestedRef.current = false;
    setState(INITIAL_STATE);
    setDocuments([]);
    setDocumentError("");
    setDocumentUploadActive(false);
    setReportPhase("idle");
    setReportProgress("saving");
    setReportThinking("");
    setDeepReviewPhase("idle");
    setReportError("");
    setQuickBooksPhase("idle");
    setQuickBooksError("");
    setValidationMessage("");
    track("financial_health_audit_restarted");
  };

  const openCta = () => {
    track("financial_health_audit_cta_clicked", { path: state.path ?? "unknown" });
    if (!state.auditId || !state.auditToken || !state.capturedEmail) {
      openWaitlist();
      return;
    }
    const configuredApp = (import.meta.env.VITE_PORTER_APP_URL as string | undefined)?.replace(
      /\/$/,
      "",
    );
    const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const appBase =
      configuredApp ??
      // Reason: Vite may be opened through either loopback spelling; both must
      // keep the audit bearer inside the local app during end-to-end testing.
      (localHost
        ? "http://localhost:5173"
        : window.location.hostname.startsWith("dev.")
          ? "https://dev.buildwithporter.com"
          : PORTER_APP_URL);
    // Reason: The bearer stays in the URL fragment, which browsers do not send
    // to either server. Porter captures and scrubs it before starting auth.
    const handoff = new URL("/claim-financial-health-audit", appBase);
    handoff.hash = new URLSearchParams({
      auditId: state.auditId,
      auditToken: state.auditToken,
    }).toString();
    window.location.assign(handoff.toString());
  };

  const captureReportEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // Reason: The email that unlocks the audit is also the identity allowed to
    // claim its company. Persist it before revealing the report so the later
    // Kinde handoff cannot silently claim with a different account.
    if (!state.auditId || !state.auditToken) {
      throw new Error("This audit cannot capture an email yet.");
    }
    await captureFinancialHealthAuditEmail(state.auditId, state.auditToken, normalizedEmail);
    setState((current) => ({ ...current, capturedEmail: normalizedEmail }));
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
          onCaptureEmail={captureReportEmail}
          titleRef={titleRef}
          deepReviewPhase={deepReviewPhase}
          onRetryDeepReview={requestDeepReview}
        />
      ) : step.kind === "report" ? (
        <ReportPendingView
          phase={reportPhase}
          error={reportError}
          onRetry={() => void requestReport(state, true)}
          onBack={back}
          titleRef={titleRef}
          progress={reportProgress}
          queuePosition={null}
          estimatedWaitSeconds={null}
          thinkingText={reportThinking}
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
          />
        </div>
      )}

      {state.stepId !== "business-type" && step.kind !== "report" ? (
        <button type="button" className="fha-restart" onClick={restart}>
          <MaterialIcon name="restart_alt" />
          Restart audit
        </button>
      ) : null}

    </main>
  );
}

function ReportPendingView({
  phase,
  progress,
  queuePosition,
  estimatedWaitSeconds,
  thinkingText,
  error,
  onRetry,
  onBack,
  titleRef,
}: {
  phase: ReportPhase;
  progress: ReportProgress;
  queuePosition: number | null;
  estimatedWaitSeconds: number | null;
  thinkingText: string;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const loading = phase !== "error";
  const reducedMotion = useReducedMotion();
  const status = reportWaitStatus(progress, queuePosition, thinkingText);
  const elapsedSeconds = useElapsedSeconds(loading);
  const waitTime = queuePosition !== null && queuePosition > 0
    ? formatWaitTime(estimatedWaitSeconds)
    : formatElapsedWait(elapsedSeconds);

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-report-pending">
        {loading ? (
          <div className="fha-report-wait" role="status" aria-live="polite" aria-atomic="true">
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
        ) : (
          <>
            <div className="fha-card__head">
              <h1 ref={titleRef} tabIndex={-1}>Your report did not finish.</h1>
              <p role="alert">{error}</p>
            </div>
            <div className="fha-card__foot">
              <button type="button" className="fha-button fha-button--quiet" onClick={onBack}>
                Back
              </button>
              <button type="button" className="fha-button fha-button--primary" onClick={onRetry}>
                Generate report
                <MaterialIcon name="refresh" />
              </button>
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
): string {
  if (progress === "saving") return "Joining queue";
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
  return seconds < 60 ? `${elapsed} / ≈1:00` : `${elapsed} elapsed`;
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
              <MaterialIcon name={item.icon} />
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
        <MaterialIcon name="cloud_upload" />
        <strong>{uploading ? "Uploading your files…" : "Drop files here, or choose files"}</strong>
        <small>PDF, spreadsheet, Word, image, or text file. Up to 8 files, 50MB each.</small>
      </label>
      <p className="fha-document-hint">
        Upload what you have. One useful file is enough to continue.
      </p>
      {documents.length ? (
        <ul className="fha-document-list" aria-live="polite">
          {documents.map((document) => (
            <li key={document.id}>
              <MaterialIcon name="description" />
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

type ReportViewProps = {
  report: AuditReport;
  path: AuditPath | null;
  answers: AuditAnswers;
  onRestart: () => void;
  onCta: () => void;
  onCaptureEmail: (email: string) => Promise<void>;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  deepReviewPhase: DeepReviewPhase;
  onRetryDeepReview: () => Promise<void>;
};

function useReportEmailUnlock(
  onCaptureEmail: (email: string) => Promise<void>,
  path: AuditPath | null,
) {
  const [reportUnlocked, setReportUnlocked] = useState(false);
  const [insightEmail, setInsightEmail] = useState("");
  const [insightEmailStatus, setInsightEmailStatus] = useState<"idle" | "submitting" | "error">("idle");

  const unlockReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setInsightEmailStatus("submitting");
    try {
      // Reason: The audit API is the canonical lead and identity boundary. The
      // Resend-powered waitlist endpoint is only a notification side effect and
      // must not prevent someone from viewing a report that already completed.
      await onCaptureEmail(insightEmail);
      setReportUnlocked(true);
      setInsightEmailStatus("idle");
      track("financial_health_audit_report_unlocked", { path: path ?? "unknown" });

      void fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: insightEmail,
          source: "financial_health_audit",
          action: "unlock_report",
        }),
      })
        .then((response) => {
          if (!response.ok) {
            track("financial_health_audit_waitlist_notification_failed", {
              path: path ?? "unknown",
              status: response.status,
            });
          }
        })
        .catch(() => {
          track("financial_health_audit_waitlist_notification_failed", {
            path: path ?? "unknown",
            status: 0,
          });
        });
    } catch {
      setInsightEmailStatus("error");
    }
  };

  return { reportUnlocked, insightEmail, setInsightEmail, insightEmailStatus, unlockReport };
}

function ReportUnlockForm({
  id,
  email,
  onEmailChange,
  status,
  onSubmit,
}: {
  id: string;
  email: string;
  onEmailChange: (value: string) => void;
  status: "idle" | "submitting" | "error";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <>
      <form onSubmit={onSubmit} className="fha-insights-gate__form">
        <label className="fha-visually-hidden" htmlFor={id}>Email address</label>
        <input
          id={id}
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
        <button type="submit" className="fha-button fha-button--primary" disabled={status === "submitting"}>
          {status === "submitting" ? "Unlocking report…" : "Unlock my report"}
        </button>
      </form>
      {status === "error" ? (
        <p className="fha-insights-gate__error" role="alert">We couldn’t save your email. Please try again.</p>
      ) : null}
    </>
  );
}

function ReportView(props: ReportViewProps) {
  // Reason: Newly generated audits use the canonical packet-backed editorial
  // contract. The legacy renderer exists only so previously stored reports can
  // still be opened without a migration-time outage.
  if (isEditorialAuditReport(props.report)) {
    return <EditorialReportView {...props} report={props.report} />;
  }
  return <LegacyReportView {...props} />;
}

function LegacyReportView({
  report,
  path,
  answers,
  onRestart,
  onCta,
  onCaptureEmail,
  titleRef,
  deepReviewPhase,
  onRetryDeepReview,
}: ReportViewProps) {
  const metrics = getReportMetrics(report, path, answers);
  const { open: openWaitlist } = useWaitlist();
  const { reportUnlocked, insightEmail, setInsightEmail, insightEmailStatus, unlockReport } = useReportEmailUnlock(
    onCaptureEmail,
    path,
  );
  const [extraInsightsUnlocked, setExtraInsightsUnlocked] = useState(false);
  const [personalizedEmailStatus, setPersonalizedEmailStatus] = useState<"idle" | "submitting" | "subscribed" | "error">("idle");
  const coreFindings = report.findings.slice(0, 3);
  const deepFindings = report.deepFindings ?? [];
  const analysisSummary = report.analysisSummary?.trim() || report.lede;
  const headline = conciseReportHeadline(report.lede);

  const bookDemoForExtraInsights = () => {
    track("financial_health_audit_extra_insights_demo_clicked", { path: path ?? "unknown" });
    openWaitlist({
      source: "financial_health_audit",
      action: "book_demo",
      email: insightEmail,
      onSuccess: () => {
        setExtraInsightsUnlocked(true);
        // Reason: The product gate is demo booking, not report viewing. Start
        // the paid second pass only after that committed intent exists.
        void onRetryDeepReview();
        track("financial_health_audit_extra_insights_unlocked", { path: path ?? "unknown" });
      },
    });
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

  if (!reportUnlocked) {
    return (
      <div className="fha-report-wrap">
        <article className="fha-report fha-report--access-gate">
          <section className="fha-report-access-gate" aria-labelledby="fha-report-access-title">
            <p className="fha-kicker">Financial health audit</p>
            <h1 id="fha-report-access-title" ref={titleRef} tabIndex={-1}>Your report is ready.</h1>
            <p>Enter your email to unlock your findings and recommended next steps.</p>
            <ReportUnlockForm
              id="fha-insight-email"
              email={insightEmail}
              onEmailChange={setInsightEmail}
              status={insightEmailStatus}
              onSubmit={unlockReport}
            />
          </section>
        </article>
      </div>
    );
  }

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

            {deepFindings.length && extraInsightsUnlocked ? (
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
            ) : extraInsightsUnlocked ? (
              <div className="fha-deep-review-pending" aria-live="polite">
                {deepReviewPhase === "error" ? (
                  <>
                    <MaterialIcon name="refresh" />
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
                    <p>Book a demo with Porter to unlock them.</p>
                  </div>
                </div>
                <button type="button" className="fha-button fha-button--primary" onClick={bookDemoForExtraInsights}>
                  Book a demo
                </button>
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
            <MaterialIcon name="add" />
          </summary>
          <div className="fha-report__details-body">
            <h2>{cleanDisplayCopy(report.confidenceTitle)}</h2>
            <p>{cleanDisplayCopy(report.confidenceBody)}</p>
            {report.scopeNote ? <p className="fha-report__scope">{cleanDisplayCopy(report.scopeNote)}</p> : null}
          </div>
        </details>

        {reportUnlocked ? (
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

type EditorialAuditReport = Omit<AuditReport, "findings" | "lockedFindings" | "keyMetrics" | "reliabilityAreas"> & {
  version: 2;
  headline: string;
  summary: string;
  findings: NarratedFinding[];
  lockedFindings: NonNullable<AuditReport["lockedFindings"]>;
  keyMetrics: NonNullable<AuditReport["keyMetrics"]>;
  reliabilityAreas: NonNullable<AuditReport["reliabilityAreas"]>;
};

function isEditorialAuditReport(report: AuditReport): report is EditorialAuditReport {
  return (
    report.version === 2 &&
    typeof report.headline === "string" &&
    typeof report.summary === "string" &&
    Array.isArray(report.keyMetrics) &&
    Array.isArray(report.lockedFindings) &&
    Array.isArray(report.reliabilityAreas) &&
    report.findings.every((finding) => "checkId" in finding && "statFactId" in finding)
  );
}

type EditorialKpiRow = {
  label: string;
  value: string;
  context: string;
  tone: "neutral" | "positive" | "caution";
  status: string;
};

type EditorialFindingSlide =
  | {
      kind: "finding";
      key: string;
      index: number;
      finding: NarratedFinding;
    }
  | {
      kind: "locked";
      key: string;
      index: number;
      finding: NonNullable<AuditReport["lockedFindings"]>[number];
    };

function getEditorialKpiRows(report: EditorialAuditReport): EditorialKpiRow[] {
  const rows = report.keyMetrics.length
    ? report.keyMetrics
    : report.findings.slice(0, 4).map((finding) => ({
        label: finding.title,
        value: finding.stat,
        context: "From the audit findings",
        tone: finding.severity === "info" ? "positive" as const : "caution" as const,
      }));

  return rows.map((row) => ({
    ...row,
    label: plainLanguageFinancialLabel(row.label),
    status: kpiStatusLabel(row.tone),
  }));
}

function getEditorialFindingSlides(report: EditorialAuditReport): EditorialFindingSlide[] {
  return [
    ...report.findings.map((finding, index) => ({
      kind: "finding" as const,
      key: `finding-${finding.checkId}`,
      index,
      finding,
    })),
    ...report.lockedFindings.map((finding, index) => ({
      kind: "locked" as const,
      key: `locked-${finding.checkId}`,
      index: report.findings.length + index,
      finding,
    })),
  ];
}

function kpiStatusLabel(tone: EditorialKpiRow["tone"]): string {
  if (tone === "positive") return "Strong";
  if (tone === "caution") return "Watch";
  return "Read";
}

function EditorialReportView({
  report,
  path,
  onRestart,
  onCaptureEmail,
  titleRef,
}: Omit<ReportViewProps, "report"> & { report: EditorialAuditReport }) {
  const [activeFinding, setActiveFinding] = useState(0);
  const { open: openWaitlist } = useWaitlist();
  const { reportUnlocked, insightEmail, setInsightEmail, insightEmailStatus, unlockReport } = useReportEmailUnlock(
    onCaptureEmail,
    path,
  );
  const kpiRows = getEditorialKpiRows(report);
  const slides = getEditorialFindingSlides(report);
  const safeActiveFinding = Math.min(activeFinding, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeActiveFinding];

  const bookDemo = () => {
    // Reason: Unlock with a demo / Book a review are waitlist CTAs. After the
    // email gate, onCta would hand off to Porter app claim instead, which is a
    // different action and a dead click in preview and whenever that app origin
    // is not running.
    track("financial_health_audit_cta_clicked", {
      path: path ?? "unknown",
      surface: "editorial_demo",
    });
    openWaitlist({
      source: "financial_health_audit",
      action: "book_demo",
      email: insightEmail || undefined,
    });
  };

  return (
    <article className="fha-editorial-report">
      <header className="fha-editorial-hero">
        <div className="fha-editorial-container">
          <div className="fha-editorial-meta">
            <span>Financial health audit</span>
            <span>{report.asOfDate ? `As of ${formatAuditDate(report.asOfDate)}` : "Audit complete"}</span>
            <span>{report.reportingBasis ? `${capitalizeFirst(report.reportingBasis)} basis` : sourceLabel(path)}</span>
          </div>
          <div className="fha-editorial-hero__copy">
            <p className="fha-editorial-section-mark">Audit complete</p>
            <h1 ref={titleRef} tabIndex={-1}>{renderNumericCopy(report.headline)}</h1>
            <p className="fha-editorial-summary">{renderNumericCopy(report.summary)}</p>
          </div>
        </div>
      </header>

      <section className="fha-editorial-kpis" aria-labelledby="fha-editorial-kpis-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">Financial picture</p>
              <h2 id="fha-editorial-kpis-title">The numbers that matter today</h2>
            </div>
            <p>{kpiRows.length} measures</p>
          </div>
          <div className="fha-editorial-kpi-table-wrap">
            <table className="fha-editorial-kpi-table">
              <caption>Key metrics from this audit</caption>
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Value</th>
                  <th scope="col">Context</th>
                  <th scope="col">Read</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((row) => (
                  <tr key={`${row.label}-${row.value}`} className={`is-${row.tone}`}>
                    <th scope="row">{row.label}</th>
                    <td>{renderNumericCopy(row.value)}</td>
                    <td>{renderNumericCopy(row.context)}</td>
                    <td><span>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Reason: Hero and the financial picture stay readable. Findings and
          everything below reuse the existing email unlock, with a NYT-style
          gradient so the rest of the packet is visible as a tease only. */}
      <div className={`fha-editorial-paywall${reportUnlocked ? "" : " is-locked"}`}>
        {reportUnlocked ? null : (
          <section className="fha-editorial-paywall__gate" aria-labelledby="fha-editorial-unlock-title">
            <div className="fha-editorial-paywall__card">
              <h2 id="fha-editorial-unlock-title">Unlock the rest of this audit</h2>
              <p>Enter your email to unlock your findings and recommended next steps.</p>
              <ReportUnlockForm
                id="fha-editorial-unlock-email"
                email={insightEmail}
                onEmailChange={setInsightEmail}
                status={insightEmailStatus}
                onSubmit={unlockReport}
              />
            </div>
          </section>
        )}
        <div className="fha-editorial-paywall__body" inert={!reportUnlocked} aria-hidden={!reportUnlocked}>
      {currentSlide ? (
        <section id="insights" className="fha-editorial-findings" aria-labelledby="fha-editorial-findings-title">
          <div className="fha-editorial-container">
            <div className="fha-editorial-section-head">
              <div>
                <p className="fha-editorial-section-mark">Findings</p>
                <h2 id="fha-editorial-findings-title">What deserves your attention</h2>
              </div>
              <nav className="fha-editorial-finding-nav" aria-label="Audit findings">
                <p>
                  {String(currentSlide.index + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")}
                </p>
                <div className="fha-editorial-finding-nav__arrows">
                  <button
                    type="button"
                    aria-label="Previous finding"
                    onClick={() => setActiveFinding((current) => (current - 1 + slides.length) % slides.length)}
                  >
                    <MaterialIcon name="arrow_back" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next finding"
                    onClick={() => setActiveFinding((current) => (current + 1) % slides.length)}
                  >
                    <MaterialIcon name="arrow_forward" />
                  </button>
                </div>
              </nav>
            </div>
            {/* Reason: Peek-carousel cards match the editorial packet: one stacked
                finding per card, with the next card visible at the stage edge. */}
            <div className="fha-editorial-finding-stage" aria-live="polite">
              <div
                className="fha-editorial-finding-track"
                style={{
                  transform: `translate3d(calc(-${safeActiveFinding} * (var(--finding-card) + var(--finding-gap))), 0, 0)`,
                }}
              >
                {slides.map((slide, index) => {
                  const kicker = findingKicker(slide.index, slide.finding.checkId, slide.kind === "finding" ? slide.finding.tiedTo : null);
                  if (slide.kind === "finding") {
                    return (
                      <article
                        key={slide.key}
                        className={`fha-editorial-finding-slide is-finding is-${slide.finding.severity}`}
                        aria-hidden={index !== safeActiveFinding}
                      >
                        <header>
                          <span>{kicker}</span>
                          <span className={`fha-editorial-severity is-${slide.finding.severity}`}>
                            {findingSeverityLabel(slide.finding.severity)}
                          </span>
                        </header>
                        <strong>{renderNumericCopy(slide.finding.stat)}</strong>
                        <h3>{slide.finding.title}</h3>
                        <p>{renderNumericCopy(slide.finding.body)}</p>
                      </article>
                    );
                  }
                  return (
                    <article
                      key={slide.key}
                      className="fha-editorial-finding-slide is-locked"
                      aria-hidden={index !== safeActiveFinding}
                    >
                      <header>
                        <span>{kicker}</span>
                        <span className="fha-editorial-severity is-locked">Locked</span>
                      </header>
                      <strong aria-hidden="true">— — —</strong>
                      <h3>{slide.finding.title}</h3>
                      <p>{slide.finding.teaser}</p>
                      <footer>
                        <button
                          type="button"
                          className="fha-button fha-button--primary"
                          tabIndex={index === safeActiveFinding ? undefined : -1}
                          onClick={bookDemo}
                        >
                          Unlock with a demo
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fha-editorial-reliability" aria-labelledby="fha-editorial-reliability-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">How much to trust</p>
              <h2 id="fha-editorial-reliability-title">How much to trust this</h2>
            </div>
          </div>
          <p className="fha-editorial-reliability__note">{renderNumericCopy(report.reliabilityNote ?? "")}</p>
          <dl>
            {report.reliabilityAreas.map((area) => (
              <div key={area.label} className={`is-${area.status}`}>
                <dt>{area.label}</dt>
                <dd>{renderNumericCopy(area.note)}</dd>
                <span aria-label={area.status}>{area.status}</span>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="fha-editorial-close">
        <div className="fha-editorial-container">
          <div>
            <p className="fha-editorial-section-mark">The invitation</p>
            <h2>Thirty minutes, your file open, and the findings we held back.</h2>
            <p>We’ll go through what’s here, show you the working numbers behind the reserved findings, and tell you plainly which decision the books can support.</p>
            <div className="fha-editorial-close__buttons">
              <button type="button" className="fha-button fha-button--primary fha-button--large" onClick={bookDemo}>Book a review</button>
              <button type="button" className="fha-text-link" onClick={onRestart}>Run the audit again</button>
            </div>
          </div>
          <div className="fha-editorial-close__notes" aria-label="Review details">
            <div>
              <span>On the call</span>
              <p>The reserved findings, with their working numbers</p>
            </div>
            <div>
              <span>You leave with</span>
              <p>A written next step tied to the audit facts</p>
            </div>
            <div>
              <span>Cost</span>
              <p>Nothing, and no obligation either way</p>
            </div>
          </div>
        </div>
      </footer>
        </div>
      </div>
    </article>
  );
}

function sourceLabel(path: AuditPath | null): string {
  if (path === "connected") return "QuickBooks connected";
  if (path === "documents") return "Uploaded records";
  return "Owner estimates";
}

function findingKicker(index: number, checkId: string, tiedTo?: string | null): string {
  return `Finding ${String(index + 1).padStart(2, "0")} · ${findingCategoryLabel(checkId, tiedTo)}`;
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
    B1: "Timeliness",
    B2: "Cleanup",
    C1: "Liquidity",
    C2: "Collections",
    C3: "Suppliers",
    P1: "Revenue",
    P2: "Profit",
    O1: "Costs",
    I0: "Context",
    I1: "Plan",
  };
  return checkLabels[prefix] ?? "Finding";
}

function findingSeverityLabel(severity: NarratedFinding["severity"]): string {
  if (severity === "high") return "Critical";
  if (severity === "medium") return "Needs attention";
  return "Good to know";
}

function capitalizeFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function formatAuditDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
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
    if (isInsightFinding(finding) || isNarratedFinding(finding)) return [];
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

function isNarratedFinding(finding: Finding): finding is NarratedFinding {
  return "checkId" in finding && "statFactId" in finding && "body" in finding;
}

function findingLabel(finding: Finding): string {
  if (isInsightFinding(finding)) return plainLanguageFinancialLabel(finding.label);
  if (isNarratedFinding(finding)) return finding.title;
  return plainLanguageFinancialLabel(finding.tag);
}

function findingNarrative(finding: Finding): string {
  if (isInsightFinding(finding)) return finding.narrative;
  if (isNarratedFinding(finding)) return finding.body;
  return finding.consequence;
}

function findingSentimentClass(finding: Finding): string {
  if (isInsightFinding(finding)) return `is-${finding.sentiment}`;
  if (isNarratedFinding(finding)) return `is-${finding.severity}`;
  return "is-neutral";
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
