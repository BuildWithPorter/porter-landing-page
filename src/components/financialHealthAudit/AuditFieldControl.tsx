/* Financial health audit questionnaire field renderer, extracted from the page by
   POR-2226. One switch over AuditField.type: the connect field delegates to
   ConnectChoice, textareas render free text, and everything else renders the
   option set as tiles or chips. Visibility is decided by fieldIsVisible against
   the current answers, so a hidden field renders nothing rather than being
   filtered out upstream. */

import { MaterialIcon } from "../MaterialIcon";
import { ConnectChoice, type QuickBooksPhase } from "./ConnectChoice";
import {
  fieldIsVisible,
  type AnswerValue,
  type AuditAnswers,
  type AuditField,
} from "../../pages/financialHealthAuditFlow";

export function AuditFieldControl({
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
