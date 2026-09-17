/* Financial health audit email gate, extracted from the page by POR-2226. Owns
   only its own submit lifecycle; the caller decides what capturing an email does
   to the audit. A rejected submit keeps the visitor here with the message rather
   than advancing, because a rotated bearer surfaces through this same path. */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { trackFinancialHealthAudit as track } from "../../pages/useFinancialHealthAuditController";
import { FinancialHealthAuditRequestError } from "../../services/financialHealthAuditError";

export function LeadCaptureView({
  initialEmail = "",
  initialError = "",
  onSubmit,
  titleRef,
}: {
  initialEmail?: string;
  initialError?: string;
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState(initialError);

  const run = async () => {
    const form = formRef.current;
    if (!form?.reportValidity() || status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      await onSubmit(email);
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Porter could not save your details. Check them and try again.",
      );
      // Reason (POR-3051): This event used to carry no properties at all, so a
      // rejected submit was indistinguishable in PostHog from the API being
      // down. POR-2942's business-email gate then started rejecting real
      // visitors (code=invalid_input, field=email) and the only way to learn
      // that was reading Render production logs line by line. The error already
      // holds the API's machine contract -- forward it. Send the code and the
      // offending field, never the typed address or the user-facing copy: the
      // address is the visitor's data and the copy is not a stable key.
      track("financial_health_audit_lead_capture_failed", {
        status: caught instanceof FinancialHealthAuditRequestError ? caught.status : null,
        code: caught instanceof FinancialHealthAuditRequestError ? caught.code : null,
        field:
          caught instanceof FinancialHealthAuditRequestError &&
          typeof caught.details?.field === "string"
            ? caught.details.field
            : null,
      });
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run();
  };

  useEffect(() => {
    // Reason: Continuing from the introduction changes only the mounted view,
    // not the controller's screen. Move keyboard focus to the newly visible
    // email heading even when hydration has already completed.
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    track("financial_health_audit_lead_gate_viewed");
  }, [titleRef]);

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-lead-gate">
        <div className="fha-lead-gate__intro">
          <div className="fha-lead-gate__copy">
            {/* Reason: Explain the real privacy benefit without implying that typing an email verifies identity. */}
            <h1 ref={titleRef} tabIndex={-1}>Keep your audit private and easy to return to.</h1>
            <p>Enter your email to save your progress. No account or password needed.</p>
          </div>
          <div className="fha-lead-gate__folio" aria-label="Your report will include six findings">
            <span>Financial health audit</span>
            <strong>06</strong>
            <p>findings grounded in your financial information</p>
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
            </div>
          </div>
        </div>

        <form ref={formRef} className="fha-lead-gate__form" onSubmit={submit}>
          <div className="fha-lead-gate__fields">
            <label htmlFor="fha-lead-email">
              <span>Email</span>
              <input
                id="fha-lead-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
          </div>
          {/* Reason: This privacy note supports the email field and needs its
              own spacing hook so it does not visually merge with the input. */}
          <p className="fha-lead-gate__helper">We’ll verify it’s you when you return, and use this address for audit updates and helpful follow-ups.</p>
          {/* Reason: A rotated bearer is an ownership-proof problem, not a
              report failure. Keep the explanation visible while the visitor
              re-enters the canonical email recovery flow. */}
          {error ? <p className="fha-lead-gate__error" role="alert">{error}</p> : null}
          <div className="fha-lead-gate__actions">
            <button type="submit" className="fha-button fha-button--primary" disabled={status === "submitting"}>
              {status === "submitting" ? "Saving…" : "Continue"}
              <MaterialIcon name="arrow_forward" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
