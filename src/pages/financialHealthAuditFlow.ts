export type AuditPath = "connected" | "documents" | "unconnected";

export type AnswerValue = string | string[];
export type AuditAnswers = Record<string, AnswerValue>;

export type ChoiceOption = {
  label: string;
  icon?: string;
};

type ShowIf = {
  field: string;
  value: string;
};

export type AuditField = {
  name: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  type: "tiles" | "chips" | "multi" | "connect" | "textarea";
  options?: ChoiceOption[];
  placeholder?: string;
  note?: string;
  showIf?: ShowIf;
};

export type AuditStep = {
  id: string;
  title: string;
  subtitle: string;
  aside: "intro" | "scan" | "counter";
  fields?: AuditField[];
  kind?: "context" | "documents" | "report";
};

export type InsightFinding = {
  metric: string;
  label: string;
  narrative: string;
  sentiment: "positive" | "neutral" | "caution" | "concerning";
  category?: "financial_picture" | "books_health" | "potential_flags" | null;
};

export type LegacyFinding = {
  tag: string;
  fact: string;
  consequence: string;
};

export type NarratedFinding = {
  checkId: string;
  stat: string;
  verdict: "looks_good" | "needs_attention" | "fact";
  title: string;
  body: string;
  fixNote: string;
  tiedTo?: string | null;
  locked: boolean;
};

export type AuditActionPlan = {
  thisWeek: Array<{ title: string; body: string }>;
  thisQuarter: Array<{ title: string; body: string }>;
};

export type Finding = InsightFinding | LegacyFinding | NarratedFinding;

export type AuditReport = {
  version?: 1 | 2;
  eyebrow: string;
  title: string;
  lede: string;
  analysisSummary?: string;
  findings: Finding[];
  additionalFindings?: Finding[];
  deepFindings?: InsightFinding[];
  confidenceTitle: string;
  confidenceBody: string;
  evidencePeriod?: string | null;
  scopeNote?: string;
  actions: Array<{ label: string; title: string; body: string }>;
  headline?: string;
  reviewPeriod?: string;
  summary?: string;
  actionPlan?: AuditActionPlan | null;
  keyMetrics?: Array<{
    label: string;
    value: string;
    context: string;
    tone: "neutral" | "positive" | "caution";
  }>;
  featuredComparison?: {
    eyebrow: string;
    title: string;
    leftLabel: string;
    leftValue: string;
    rightLabel: string;
    rightValue: string;
    ratio?: string | null;
    interpretation: string;
  } | null;
  evidenceBlocks?: Array<{
    title: string;
    description: string;
    columns: string[];
    rows: string[][];
  }>;
  reliabilityNote?: string;
  reliabilityAreas?: Array<{
    label: string;
    status: "good" | "watch" | "gap";
    note: string;
  }>;
  asOfDate?: string | null;
  reportingBasis?: string | null;
  auditPacketVersion?: string | null;
  isSample: boolean;
};

const choice = (label: string, icon?: string): ChoiceOption => ({ label, icon });

export const AUDIT_GOALS = [
  choice("See what’s wrong or missing in my books"),
  choice("Find cost-saving opportunities"),
  choice("See which jobs or customers actually make me money"),
  choice("Know if I can afford my next big move (expansion, vehicle purchase, new hire, etc)"),
  choice("Understand my cash flow needs"),
  choice("Get paid faster by customers who owe me"),
  choice("Something else"),
];

export const STEPS: Record<string, AuditStep> = {
  "business-type": {
    id: "business-type",
    title: "What kind of business is this?",
    subtitle: "We’ll tailor the findings to your business.",
    aside: "intro",
    fields: [
      {
        type: "tiles",
        name: "business_type",
        label: "Business type",
        hideLabel: true,
        options: [
          choice("HVAC (heating and air)", "settings"),
          choice("Plumbing or electrical", "construction"),
          choice("Restoration or cleaning", "auto_awesome"),
          choice("Other home services", "home_work"),
          choice("Interior design", "edit_square"),
          choice("Restaurant or food service", "restaurant"),
          choice("Professional services", "business_center"),
          choice("Something else", "more_horiz"),
        ],
      },
      {
        type: "textarea",
        name: "business_type_other",
        label: "What kind of business is it?",
        required: true,
        placeholder: "Tell us what your business does",
        showIf: { field: "business_type", value: "Something else" },
      },
    ],
  },
  connect: {
    id: "connect",
    title: "How would you like to run your audit?",
    subtitle: "Connect QuickBooks, upload financial documents, or answer a few questions.",
    aside: "intro",
    fields: [
      {
        type: "connect",
        name: "connection_choice",
        label: "Access",
        options: [choice("quickbooks"), choice("documents"), choice("questions")],
      },
    ],
  },
  goal: {
    id: "goal",
    title: "What would you most like help figuring out?",
    subtitle: "Select all that apply.",
    aside: "scan",
    fields: [
      {
        type: "multi",
        name: "audit_goals",
        label: "What you want to learn",
        hideLabel: true,
        options: AUDIT_GOALS,
      },
      {
        type: "textarea",
        name: "audit_goals_other",
        label: "Tell us what is on your mind",
        required: true,
        placeholder: "What decision or concern brought you here?",
        showIf: { field: "audit_goals", value: "Something else" },
      },
    ],
  },
  "revenue-pattern": {
    id: "revenue-pattern",
    title: "What does revenue usually look like month to month?",
    subtitle: "Choose the answer that sounds most like your business.",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "revenue_pattern",
        label: "Revenue pattern",
        hideLabel: true,
        options: [
          choice("Pretty steady"),
          choice("Seasonal, but predictable"),
          choice("A few big projects or orders"),
          choice("Mostly from a few big customers"),
          choice("It changes a lot"),
          choice("I’m not sure"),
        ],
      },
    ],
  },
  bookkeeping: {
    id: "bookkeeping",
    title: "Who takes care of your books today?",
    subtitle: "This helps us tailor your findings and recommendations.",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "bookkeeping_owner",
        label: "Who takes care of your books",
        hideLabel: true,
        options: [
          choice("I do them myself"),
          choice("Someone on my team"),
          choice("An outside bookkeeper or firm"),
          choice("My accountant, mostly at tax time"),
          choice("No one right now"),
        ],
      },
      {
        type: "chips",
        name: "monthly_bookkeeping_cost",
        label: "How much do you pay for bookkeeping each month? (Optional)",
        required: false,
        options: [
          choice("Nothing"),
          choice("Under $300"),
          choice("$300 to $1,000"),
          choice("$1,000 to $2,500"),
          choice("Over $2,500"),
          choice("Not sure"),
        ],
      },
    ],
  },
  "cash-plans": {
    id: "cash-plans",
    title: "What’s the next big expense or decision coming up?",
    subtitle: "Choose the one that is most likely to affect the business next.",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "biggest_cash_plan",
        label: "Biggest planned use of cash",
        hideLabel: true,
        options: [
          choice("Hiring"),
          choice("Equipment or vehicles"),
          choice("Inventory or materials"),
          choice("Opening or expanding a location"),
          choice("Paying down debt or taxes"),
          choice("Taking money out of the business"),
          choice("Nothing big planned"),
          choice("Not sure yet"),
        ],
      },
      {
        type: "textarea",
        name: "cash_plan_details",
        label: "Anything specific in mind?",
        placeholder: "An $80k truck this fall, or two new hires in January",
      },
    ],
  },
  "books-confidence": {
    id: "books-confidence",
    title: "How confident are you in your numbers today?",
    subtitle: "Think about whether last month is complete and the balances look right.",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "books_confidence",
        label: "Confidence in your books",
        hideLabel: true,
        options: [
          choice("Very confident: last month is complete"),
          choice("Mostly confident: a few things may be off"),
          choice("Not very confident: we need some cleanup"),
          choice("We’re a few months behind"),
          choice("I’m not sure"),
        ],
      },
    ],
  },
  context: {
    id: "context",
    title: "Tell us where to look.",
    subtitle: "A website or short description helps tailor the findings.",
    aside: "counter",
    kind: "context",
  },
  "document-upload": {
    id: "document-upload",
    title: "Upload the financial files you have.",
    subtitle: "Drop multiple files at once. A recent P&L, balance sheet, statements, or aging reports are all useful.",
    aside: "counter",
    kind: "documents",
  },
  "cash-basics": {
    id: "cash-basics",
    title: "Let’s get a quick picture of the cash coming in and going out.",
    subtitle: "Estimates are fine.",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "cash_on_hand",
        label: "About how much cash does the business have available today?",
        options: [choice("Under $10k"), choice("$10k to $50k"), choice("$50k to $250k"), choice("$250k to $1m"), choice("Over $1m")],
      },
      {
        type: "chips",
        name: "monthly_out",
        label: "About how much does the business spend in a typical month?",
        options: [choice("Under $10k"), choice("$10k to $50k"), choice("$50k to $250k"), choice("Over $250k")],
      },
    ],
  },
  "costs-prices": {
    id: "costs-prices",
    title: "Over the past year, what happened to your costs and prices?",
    subtitle: "This helps us spot pressure on your margins.",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "costs_moved",
        label: "Your costs",
        options: [choice("Went up a lot"), choice("Went up a little"), choice("Stayed about the same"), choice("Went down")],
      },
      {
        type: "chips",
        name: "prices_moved",
        label: "What you charge customers",
        options: [choice("Went up a lot"), choice("Went up a little"), choice("Stayed about the same"), choice("Went down")],
      },
    ],
  },
  "customer-cash": {
    id: "customer-cash",
    title: "How quickly do sales turn into cash?",
    subtitle: "Estimates are fine.",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "payment_time",
        label: "How long does it usually take customers to pay you?",
        options: [choice("Paid upfront"), choice("Within 30 days"), choice("30 to 60 days"), choice("Some invoices over 60 days"), choice("Unsure")],
      },
      {
        type: "chips",
        name: "invoices_guess",
        label: "About how much is waiting to be paid?",
        options: [
          choice("Nothing: customers pay upfront"),
          choice("Under $5k"),
          choice("$5k to $25k"),
          choice("$25k to $100k"),
          choice("Over $100k"),
          choice("Unsure"),
        ],
      },
    ],
  },
  "complete-c": {
    id: "complete-c",
    title: "Three things worth your attention.",
    subtitle: "",
    aside: "scan",
    kind: "report",
  },
  "complete-u": {
    id: "complete-u",
    title: "Three things worth your attention.",
    subtitle: "",
    aside: "counter",
    kind: "report",
  },
  "complete-d": {
    id: "complete-d",
    title: "Three things worth your attention.",
    subtitle: "",
    aside: "counter",
    kind: "report",
  },
};

export const FLOWS: Record<AuditPath, string[]> = {
  connected: ["business-type", "connect", "goal", "bookkeeping", "cash-plans", "books-confidence", "complete-c"],
  documents: ["business-type", "connect", "document-upload", "goal", "revenue-pattern", "cash-plans", "books-confidence", "complete-d"],
  unconnected: [
    "business-type",
    "connect",
    "context",
    "goal",
    "cash-basics",
    "revenue-pattern",
    "costs-prices",
    "customer-cash",
    "cash-plans",
    "books-confidence",
    "complete-u",
  ],
};

export const SHARED_FLOW = ["business-type", "connect"];

export function fieldIsVisible(field: AuditField, answers: AuditAnswers): boolean {
  if (!field.showIf) return true;
  const value = answers[field.showIf.field];
  return Array.isArray(value) ? value.includes(field.showIf.value) : value === field.showIf.value;
}

export function canContinue(step: AuditStep, answers: AuditAnswers): boolean {
  if (step.kind === "context" || step.kind === "documents" || step.kind === "report") return true;
  const required = (step.fields ?? []).filter(
    (field) =>
      field.required !== false &&
      (field.type !== "textarea" || field.required === true) &&
      fieldIsVisible(field, answers),
  );
  return required.every((field) => {
    const value = answers[field.name];
    if (field.type === "textarea" && typeof value === "string") return value.trim().length > 0;
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}
