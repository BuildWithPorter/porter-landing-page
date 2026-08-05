export type AuditPath = "connected" | "unconnected";

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
  kind?: "context" | "report";
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

export const PRIORITIES = [
  choice("Understand revenue and cost drivers"),
  choice("Close the books faster"),
  choice("Improve invoicing and collections"),
  choice("Streamline accounts payable"),
  choice("Track where cash is going"),
  choice("Clean up the books"),
  choice("Prepare for growth or a sale"),
  choice("Other"),
];

const CLOSE_OPTIONS = [
  choice("A day or less"),
  choice("A few days"),
  choice("About a week"),
  choice("More than a week"),
  choice("It never really gets closed"),
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
    title: "Do you use QuickBooks?",
    subtitle: "Connect for a books-backed checkup, or continue without it.",
    aside: "intro",
    fields: [
      {
        type: "connect",
        name: "connection_choice",
        label: "Access",
        options: [choice("quickbooks"), choice("skip")],
      },
    ],
  },
  runway: {
    id: "runway",
    title: "If your income stopped today, how many months could you keep covering expenses?",
    subtitle: "",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "runway_guess",
        label: "Your estimate",
        hideLabel: true,
        options: [
          choice("Under 1 month"),
          choice("1 to 3 months"),
          choice("3 to 6 months"),
          choice("6 months or more"),
          choice("Unsure"),
        ],
      },
    ],
  },
  invoices: {
    id: "invoices",
    title: "Roughly how much is sitting in unpaid invoices right now?",
    subtitle: "",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "invoices_guess",
        label: "Your estimate",
        hideLabel: true,
        options: [
          choice("Under $5k"),
          choice("$5k to $25k"),
          choice("$25k to $100k"),
          choice("Over $100k"),
          choice("Unsure"),
        ],
      },
    ],
  },
  "priorities-c": {
    id: "priorities-c",
    title: "What are your priorities right now?",
    subtitle: "Select all that apply.",
    aside: "scan",
    fields: [
      { type: "multi", name: "priorities", label: "Priorities", hideLabel: true, options: PRIORITIES },
      {
        type: "textarea",
        name: "priorities_other",
        label: "Tell us more",
        placeholder: "What brought you here today?",
        showIf: { field: "priorities", value: "Other" },
      },
    ],
  },
  bookkeeping: {
    id: "bookkeeping",
    title: "Who manages your bookkeeping?",
    subtitle: "",
    aside: "scan",
    fields: [
      {
        type: "chips",
        name: "bookkeeping",
        label: "Bookkeeping",
        hideLabel: true,
        options: [choice("I do"), choice("In-house staff"), choice("Outside bookkeeper"), choice("No one currently")],
      },
      {
        type: "chips",
        name: "close_time_self",
        label: "How long do you spend closing a month of books?",
        options: CLOSE_OPTIONS,
        showIf: { field: "bookkeeping", value: "I do" },
      },
      {
        type: "chips",
        name: "close_time_staff",
        label: "How long does your staff spend closing a month of books?",
        options: CLOSE_OPTIONS,
        showIf: { field: "bookkeeping", value: "In-house staff" },
      },
      {
        type: "chips",
        name: "financials_delivery",
        label: "How long after month-end do you get last month's financials?",
        options: [
          choice("Within a week"),
          choice("One to two weeks"),
          choice("Two to four weeks"),
          choice("More than a month"),
          choice("Not sure"),
        ],
        showIf: { field: "bookkeeping", value: "Outside bookkeeper" },
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
  cash: {
    id: "cash",
    title: "Roughly how much cash is across your business accounts right now?",
    subtitle: "",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "cash_on_hand",
        label: "Cash on hand",
        hideLabel: true,
        options: [choice("Under $10k"), choice("$10k to $50k"), choice("$50k to $250k"), choice("$250k to $1m"), choice("Over $1m")],
      },
    ],
  },
  spend: {
    id: "spend",
    title: "In a typical month, roughly how much goes out?",
    subtitle: "",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "monthly_out",
        label: "Monthly outflow",
        hideLabel: true,
        options: [choice("Under $10k"), choice("$10k to $50k"), choice("$50k to $250k"), choice("Over $250k")],
      },
    ],
  },
  "costs-prices": {
    id: "costs-prices",
    title: "Over the past 12 months, how have your costs and prices moved?",
    subtitle: "",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "costs_moved",
        label: "Costs have…",
        options: [choice("Increased significantly"), choice("Increased slightly"), choice("Stayed flat"), choice("Decreased")],
      },
      {
        type: "chips",
        name: "prices_moved",
        label: "Prices have…",
        options: [choice("Increased significantly"), choice("Increased slightly"), choice("Stayed flat"), choice("Decreased")],
      },
    ],
  },
  payment: {
    id: "payment",
    title: "How long do customers typically take to pay you?",
    subtitle: "",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "payment_time",
        label: "Typical payment time",
        hideLabel: true,
        options: [choice("Paid upfront"), choice("Within 30 days"), choice("30 to 60 days"), choice("Some invoices over 60 days"), choice("Unsure")],
      },
    ],
  },
  close: {
    id: "close",
    title: "How long does it take you to close a month?",
    subtitle: "",
    aside: "counter",
    fields: [
      {
        type: "chips",
        name: "close_time",
        label: "Time to close",
        hideLabel: true,
        options: [choice("One day or less"), choice("Several days"), choice("More than a week"), choice("We do not close monthly")],
      },
    ],
  },
  "priorities-u": {
    id: "priorities-u",
    title: "What are your priorities right now?",
    subtitle: "Select all that apply.",
    aside: "counter",
    fields: [
      { type: "multi", name: "priorities", label: "Priorities", hideLabel: true, options: PRIORITIES },
      {
        type: "textarea",
        name: "priorities_other",
        label: "Tell us more",
        placeholder: "What brought you here today?",
        showIf: { field: "priorities", value: "Other" },
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
};

export const FLOWS: Record<AuditPath, string[]> = {
  connected: ["business-type", "connect", "runway", "invoices", "priorities-c", "bookkeeping", "complete-c"],
  unconnected: ["business-type", "connect", "context", "cash", "spend", "costs-prices", "payment", "close", "priorities-u", "complete-u"],
};

export const SHARED_FLOW = ["business-type", "connect"];

export function fieldIsVisible(field: AuditField, answers: AuditAnswers): boolean {
  if (!field.showIf) return true;
  const value = answers[field.showIf.field];
  return Array.isArray(value) ? value.includes(field.showIf.value) : value === field.showIf.value;
}

export function canContinue(step: AuditStep, answers: AuditAnswers): boolean {
  if (step.kind === "context" || step.kind === "report") return true;
  const required = (step.fields ?? []).filter((field) => field.type !== "textarea" && fieldIsVisible(field, answers));
  return required.every((field) => {
    const value = answers[field.name];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
}
