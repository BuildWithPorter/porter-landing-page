import assert from "node:assert/strict";
import test from "node:test";

import { AUDIT_GOALS } from "../src/pages/financialHealthAuditFlow.ts";
import { LEGACY_ANSWER_VALUE_MAP } from "../src/pages/financialHealthAuditState.ts";

/* Reason (POR-2226): the audit answer labels are a cross-repository contract
 * matched on exact English prose. Everything the questionnaire can offer, plus
 * every legacy label a stale bundle can still submit, has to appear verbatim in
 * the audit_goals / business_type / connection_choice / biggest_cash_plan /
 * books_confidence / invoices_guess Literal unions in the monorepo's
 * apps/api/app/public_financial_audit/models.py. There is no shared schema and no
 * build step joining the two repos: an edit on one side alone makes the API
 * reject or silently drop the answer, and the only signal is a log line.
 *
 * So these are hardcoded literals on purpose, not derived from the source they
 * guard. Deriving them would assert nothing. A refactor that reorders, reformats
 * or relocates these tables passes; one that changes a single character fails,
 * and the fix is to change the monorepo union in the same release, not to update
 * the expectations here.
 *
 * Note the curly apostrophes (’ U+2019, not '). They are load-bearing.
 */

const EXPECTED_AUDIT_GOAL_LABELS = [
  "See what’s wrong or missing in my books",
  "Find cost-saving opportunities",
  "See which jobs or customers actually make me money",
  "Know if I can afford my next big move (expansion, vehicle purchase, new hire, etc)",
  "Understand my cash flow needs",
  "Get paid faster by customers who owe me",
  "Something else",
];

const EXPECTED_LEGACY_ANSWER_VALUE_MAP = {
  business_type: { Other: "Something else" },
  connection_choice: { skip: "questions" },
  audit_goals: {
    "See where my money is going": "Understand my cash flow needs",
    "Understand why costs are rising": "Find cost-saving opportunities",
    "Know how much cash to keep": "Understand my cash flow needs",
    "See what I can afford to invest":
      "Know if I can afford my next big move (expansion, vehicle purchase, new hire, etc)",
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
  invoices_guess: { "Nothing — customers pay upfront": "Nothing: customers pay upfront" },
};

test("the audit_goals option labels are byte-identical to the API contract", () => {
  assert.deepEqual(
    AUDIT_GOALS.map((option) => option.label),
    EXPECTED_AUDIT_GOAL_LABELS,
  );
});

test("the legacy answer remap is byte-identical to the API contract", () => {
  assert.deepEqual(LEGACY_ANSWER_VALUE_MAP, EXPECTED_LEGACY_ANSWER_VALUE_MAP);
});

test("every legacy audit_goals label maps onto a label the questionnaire still offers", () => {
  // Reason: a remap target that no longer exists as an option is dropped by
  // normalizeStoredAnswers, so a returning visitor silently loses the answer.
  for (const target of Object.values(LEGACY_ANSWER_VALUE_MAP.audit_goals)) {
    assert.ok(
      EXPECTED_AUDIT_GOAL_LABELS.includes(target),
      `legacy audit_goals maps to "${target}", which is not an offered option`,
    );
  }
});
