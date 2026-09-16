/* Financial health audit optional business-context question, extracted from the
   page by POR-2226. */

import type { AnswerValue, AuditAnswers } from "../../pages/financialHealthAuditFlow";

export function ContextField({
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
