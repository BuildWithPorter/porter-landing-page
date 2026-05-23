export type ServiceKey =
  | "bookkeeping"
  | "ar"
  | "ap"
  | "payroll"
  | "tax"
  | "insights";

export type ServiceBullet = { icon: string; title: string; body: string };

export type Service = {
  key: ServiceKey;
  icon: string;
  title: string;
  exampleQuestion: string;
  userMessage: string;
  intro: string;
  bullets: ServiceBullet[];
};

export const SERVICES: Service[] = [
  {
    key: "bookkeeping",
    icon: "menu_book",
    title: "Bookkeeping & Accounting",
    exampleQuestion: "How do you handle my books?",
    userMessage: "How can you help me with bookkeeping and accounting?",
    intro:
      "Bookkeeping is our bread and butter. Porter learns your business from day one and gets better every month. You ask in plain language — no debits, no credits, no jargon — and we keep your books clean, current, and ready for any question you throw at them.",
    bullets: [
      {
        icon: "psychology",
        title: "Corporate memory that compounds",
        body: "Porter learns your vendors, recurring deposits, and edge cases. Every rule you confirm becomes context for the next transaction. Month 3 looks nothing like month 1.",
      },
      {
        icon: "chat",
        title: "Plain-language Q&A",
        body: "Ask \"how much did we spend on AWS last quarter?\" or \"reclassify the Brex meal under T&E\" — Porter does it. No accountant-speak required.",
      },
      {
        icon: "schedule",
        title: "Always on, faster than traditional",
        body: "Not a 9-to-5 bookkeeper. Available 24/7. Books closed in days, not weeks. Real-time visibility into every transaction.",
      },
      {
        icon: "verified_user",
        title: "Every entry human-approved",
        body: "AI proposes, a Porter team member verifies. Nothing posts without an explicit approval — your books stay audit-grade.",
      },
    ],
  },
  {
    key: "ar",
    icon: "request_quote",
    title: "Accounts Receivable",
    exampleQuestion: "How do you help me get paid faster?",
    userMessage: "How do you help me get paid faster?",
    intro:
      "Most businesses lose 8–12% of revenue to slow or missed collections. Porter watches your receivables every day so you don't have to remember.",
    bullets: [
      {
        icon: "outgoing_mail",
        title: "Invoices sent automatically",
        body: "Recurring or one-off, Porter ships invoices on schedule. Branded, accurate, and on the right terms.",
      },
      {
        icon: "visibility",
        title: "AR aging watched daily",
        body: "Porter knows the day an invoice slips past terms — before your bookkeeper would even glance at the aging report.",
      },
      {
        icon: "edit_note",
        title: "Follow-ups drafted, you approve",
        body: "A polite nudge at 7 days, firmer at 30, escalation at 60. Porter writes them; one click sends.",
      },
      {
        icon: "task_alt",
        title: "Payments auto-matched",
        body: "When the money lands, Porter matches it to the invoice, clears the receivable, and updates cash. No spreadsheet wrangling.",
      },
    ],
  },
  {
    key: "ap",
    icon: "receipt_long",
    title: "Accounts Payable",
    exampleQuestion: "Can you manage my bills and vendors?",
    userMessage: "Can you manage my bills and vendors?",
    intro:
      "Porter pays smart, not fast. Bills land in one place. Vendors get paid on time, never twice, never early when they shouldn't be. Subscription sprawl gets surfaced before it eats your margins.",
    bullets: [
      {
        icon: "forward_to_inbox",
        title: "Bill capture by email",
        body: "Forward invoices to a Porter inbox. We extract vendor, amount, due date, and terms — no manual entry.",
      },
      {
        icon: "schedule_send",
        title: "Pay on time, not early",
        body: "Optimizes cash by paying close to due date, unless an early-pay discount makes it worth it. Your money stays with you longer.",
      },
      {
        icon: "memory",
        title: "Vendor memory",
        body: "Knows your usual vendors, flags new ones, catches duplicates, and notices when a vendor changes their bank details.",
      },
      {
        icon: "savings",
        title: "Surfaces sprawl",
        body: "Tools nobody uses, overlapping SaaS, double-charges from card resets — Porter finds them and asks if you'd like to cancel.",
      },
    ],
  },
  {
    key: "payroll",
    icon: "payments",
    title: "Payroll",
    exampleQuestion: "How do you handle payroll?",
    userMessage: "How do you handle payroll?",
    intro:
      "Porter integrates with your payroll provider (Gusto, Rippling, ADP) and handles everything downstream of the run — booking, reconciliation, accruals, and anomaly detection. Your P&L tells the truth about labor cost every month.",
    bullets: [
      {
        icon: "auto_awesome",
        title: "Auto-booked every cycle",
        body: "Wages, employer taxes, and benefits flow into the right accounts, mapped to the right departments — no manual journal entry.",
      },
      {
        icon: "compare_arrows",
        title: "Cash reconciliation",
        body: "Matches what your payroll provider says you paid against what hit your bank. Discrepancies surface immediately.",
      },
      {
        icon: "event_repeat",
        title: "Accruals that tell the truth",
        body: "PTO, bonuses, commissions — accrued correctly so your monthly numbers reflect what you actually owe.",
      },
      {
        icon: "report",
        title: "Anomaly detection",
        body: "A new headcount that wasn't budgeted. A bonus tagged to the wrong department. A misclassified contractor. Porter flags it before it costs you.",
      },
    ],
  },
  {
    key: "tax",
    icon: "gavel",
    title: "Taxes & Audit",
    exampleQuestion: "Are you ready for tax season and audits?",
    userMessage: "Are you ready for tax season and audits?",
    intro:
      "Today, we make you tax-ready and audit-ready. Your CPA shows up to clean books and a one-click export packet your auditors will love. Coming next tax season: Porter files for you, end to end.",
    bullets: [
      {
        icon: "task_alt",
        title: "Clean books, always",
        body: "Every transaction categorized, every accrual booked, every reconciliation closed. When April comes, there's no scramble.",
      },
      {
        icon: "folder_zip",
        title: "Exportable tax + audit packet",
        body: "One click → year-end financials, supporting docs, audit trail, revenue-by-state for sales tax. Send straight to your CPA.",
      },
      {
        icon: "fact_check",
        title: "Question-ready in minutes",
        body: "\"Show me Q3 revenue by state\" → answer in 2 minutes with the underlying transactions. No more week-long bookkeeper waits.",
      },
      {
        icon: "schedule",
        title: "Filings, coming next season",
        body: "Federal, state, and sales tax filings handled inside Porter. Same team, same data, no handoff. Ready for next filing cycle.",
      },
    ],
  },
  {
    key: "insights",
    icon: "insights",
    title: "Financial Insights",
    exampleQuestion: "How are you my financial copilot?",
    userMessage: "How are you my financial copilot?",
    intro:
      "Porter doesn't hand you a static report at month-end. It's a copilot you can ask anything, anytime — variance explanations, scenario models, charts on demand. The financial analyst you couldn't afford to hire, always on.",
    bullets: [
      {
        icon: "psychology_alt",
        title: "Q&A in plain English",
        body: "\"Which customer drove the most revenue last quarter?\" \"Show me churn by cohort.\" Ask the way you'd ask a person; get the answer with the underlying numbers.",
      },
      {
        icon: "trending_up",
        title: "Scenario modeling",
        body: "\"What if we hire two engineers next month?\" Porter models the cash impact, updates runway, and shows you the new burn curve in seconds.",
      },
      {
        icon: "query_stats",
        title: "Variance explanations",
        body: "Numbers that surprise you get traced back to the transactions that caused them. No more squinting at a P&L wondering what happened.",
      },
      {
        icon: "bar_chart",
        title: "Charts on demand",
        body: "Need a slide for your board deck? Ask Porter for the chart. Revenue cohort, gross margin trend, cash runway — generated and exportable.",
      },
    ],
  },
];
