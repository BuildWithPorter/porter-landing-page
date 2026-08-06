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
};

export type LegacyFinding = {
  tag: string;
  fact: string;
  consequence: string;
};

export type Finding = InsightFinding | LegacyFinding;

export type AuditReport = {
  eyebrow: string;
  title: string;
  lede: string;
  findings: Finding[];
  confidenceTitle: string;
  confidenceBody: string;
  evidencePeriod?: string | null;
  scopeNote?: string;
  actions: Array<{ label: string; title: string; body: string }>;
  isSample: boolean;
};

const choice = (label: string, icon?: string): ChoiceOption => ({ label, icon });

export const AUDIT_GOALS = [
  choice("See where my money is going"),
  choice("Understand why costs are rising"),
  choice("Know how much cash to keep"),
  choice("See what I can afford to invest"),
  choice("Get ready to apply for financing"),
  choice("Get customers to pay faster"),
  choice("Feel more confident in my numbers"),
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
          choice("Construction", "construction"),
          choice("Professional services", "business_center"),
          choice("Ecommerce", "shopping_cart"),
          choice("Retail", "storefront"),
          choice("Restaurant or food service", "restaurant"),
          choice("Healthcare", "health_and_safety"),
          choice("Real estate", "apartment"),
          choice("Other", "more_horiz"),
        ],
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
  "cash-plans": {
    id: "cash-plans",
    title: "What could put the most pressure on cash over the next year?",
    subtitle: "Choose the biggest planned expense or use of cash.",
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
          choice("Inventory"),
          choice("Opening or expanding a location"),
          choice("Paying taxes or debt"),
          choice("Taking money out of the business"),
          choice("Nothing major planned"),
          choice("I’m not sure yet"),
        ],
      },
      {
        type: "textarea",
        name: "cash_plan_details",
        label: "Have a rough amount or date in mind? (Optional)",
        placeholder: "For example: an $80k truck this fall, or two new hires in January",
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
  connected: ["business-type", "connect", "goal", "revenue-pattern", "cash-plans", "books-confidence", "complete-c"],
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
  const required = (step.fields ?? []).filter((field) => field.type !== "textarea" && fieldIsVisible(field, answers));
  return required.every((field) => {
    const value = answers[field.name];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}
