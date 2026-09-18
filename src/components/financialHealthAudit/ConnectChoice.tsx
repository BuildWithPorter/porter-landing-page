/* Financial health audit source chooser, extracted from the page by POR-2226.
   The QuickBooks card is the only one that does not simply record an answer: it
   calls onQuickBooks so the controller can start the OAuth handoff, and falls
   back to recording "quickbooks" only when no handler is supplied (the dev
   preview). Do not "simplify" that into a plain onChange -- the handoff has to be
   durably stored before the browser leaves the page. */

import { MaterialIcon } from "../MaterialIcon";
import type { AnswerValue } from "../../pages/financialHealthAuditFlow";

export type QuickBooksPhase = "idle" | "connecting" | "error";

export function ConnectChoice({
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
