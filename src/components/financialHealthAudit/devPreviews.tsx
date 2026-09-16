/* Financial health audit dev-only previews, extracted from the page by POR-2226.
   Each of these renders one view with a fixed payload so it can be inspected
   without a backend, an audit session, or a completed report:

     /financial-health-audit?preview=editorial-report
     /financial-health-audit?preview=report-wait
     /financial-health-audit?preview=lead-gate
     /financial-health-audit?preview=recovery-code

   The predicates that match those query strings live in devPreviewRoute.ts, not
   here: react-refresh requires a file exporting components to export nothing
   else. They all return false unless import.meta.env.DEV, so a production bundle
   can never route to a preview however the query string is set. */

import { useRef } from "react";
import { LeadCaptureView } from "./LeadCaptureView";
import { RecoveryAuthView } from "./RecoveryAuthView";
import { ReportPendingView } from "./ReportPendingView";
import { ReportView } from "./ReportView";
import type { AuditReport } from "../../pages/financialHealthAuditFlow";

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

export function EditorialReportPreview() {
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

export function ReportPendingPreview() {
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

export function LeadGatePreview() {
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

export function RecoveryCodePreview() {
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
