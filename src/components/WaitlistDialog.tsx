import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { stableSubmissionAttempt } from "../utils/stableSubmissionAttempt";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import "./WaitlistDialog.css";

// ─── Context ────────────────────────────────────────────────
// One dialog instance, opened from anywhere via `useWaitlist().open()`.

export type WaitlistOpenOptions = {
  source?: "financial_health_audit";
  action?: "book_demo";
  multiEntity?: boolean;
  name?: string;
  email?: string;
  onSuccess?: (lead: WaitlistLead) => void;
};

export type WaitlistLead = {
  name: string;
  email: string;
  company: string;
  existingFinanceTeam: string;
  helpWith: string;
  entityCount: string;
  consolidationNeed: string;
};

type OpenWaitlist = {
  (): void;
  (options: WaitlistOpenOptions): void;
};

type Ctx = { open: OpenWaitlist; close: () => void; isOpen: boolean };
const WaitlistCtx = createContext<Ctx | null>(null);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openOptions, setOpenOptions] = useState<WaitlistOpenOptions>({});
  const successHandlerRef = useRef<((lead: WaitlistLead) => void) | undefined>(undefined);
  const open = useCallback((options?: WaitlistOpenOptions) => {
    successHandlerRef.current = options?.onSuccess;
    setOpenOptions(options ?? {});
    setIsOpen(true);
  }, []) as OpenWaitlist;
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <WaitlistCtx.Provider value={{ open, close, isOpen }}>
      {children}
      <WaitlistDialog
        open={isOpen}
        onClose={close}
        source={openOptions.source}
        action={openOptions.action}
        multiEntity={openOptions.multiEntity}
        initialName={openOptions.name}
        initialEmail={openOptions.email}
        onSuccess={(lead) => successHandlerRef.current?.(lead)}
      />
    </WaitlistCtx.Provider>
  );
}

export function useWaitlist() {
  const ctx = useContext(WaitlistCtx);
  if (!ctx) throw new Error("useWaitlist must be used inside WaitlistProvider");
  return ctx;
}

// ─── Dialog ─────────────────────────────────────────────────

type Status = "idle" | "submitting" | "awaiting_booking" | "success" | "error";

function WaitlistDialog({
  open,
  onClose,
  source,
  action,
  multiEntity,
  initialName,
  initialEmail,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  source?: "financial_health_audit";
  action?: "book_demo";
  multiEntity?: boolean;
  initialName?: string;
  initialEmail?: string;
  onSuccess: (lead: WaitlistLead) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [submittedLead, setSubmittedLead] = useState<WaitlistLead | null>(null);
  const submissionAttemptRef = useRef<ReturnType<typeof stableSubmissionAttempt> | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Lock background scroll + focus the first field when opened.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset status when dialog reopens after a success/error.
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setSubmittedLead(null);
      submissionAttemptRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (status !== "awaiting_booking") return;

    // Reason: The lead email is intentionally sent before Calendly so Porter
    // keeps incomplete leads, but the visible confirmation must mean a time was
    // actually booked. Calendly's embed emits this message only after booking.
    const onCalendlyMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://calendly.com" ||
        !event.data ||
        typeof event.data !== "object" ||
        event.data.event !== "calendly.event_scheduled"
      ) {
        return;
      }
      setSubmittedLead(null);
      setStatus("success");
    };

    window.addEventListener("message", onCalendlyMessage);
    return () => window.removeEventListener("message", onCalendlyMessage);
  }, [status]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // Reason: This dialog suppresses browser-default validation for inline errors; explicitly
    // validate required entity choices before treating the multi-entity request as complete.
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    // Reason: The Calendly handoff must reuse the normalized lead that Porter
    // accepted, so the immediate email and prefilled booking cannot diverge.
    const lead = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim().toLowerCase(),
      company: String(data.get("company") ?? "").trim(),
      existingFinanceTeam: String(data.get("existing_finance_team") ?? "").trim(),
      helpWith: String(data.get("help_with") ?? "").trim(),
      entityCount: String(data.get("entity_count") ?? "").trim(),
      consolidationNeed: String(data.get("consolidation_need") ?? "").trim(),
    };
    // Build a clean JSON payload for the thin Vercel proxy. Porter API owns
    // the fixed support recipient and canonical Postmark delivery policy.
    const payload = {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      existing_finance_team: lead.existingFinanceTeam,
      help_with: [
        lead.entityCount && `Companies or entities managed: ${lead.entityCount}`,
        lead.consolidationNeed && `Top priority: ${lead.consolidationNeed}`,
        lead.helpWith,
      ].filter(Boolean).join("\n\n"),
      source,
      action,
      _honey: String(data.get("_honey") ?? ""),
    };
    const attempt = stableSubmissionAttempt(submissionAttemptRef.current, JSON.stringify(payload));
    submissionAttemptRef.current = attempt;
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Reason: Keep the receipt id authoritative even if the lead shape
        // later gains a similarly named field during a refactor.
        body: JSON.stringify({ ...payload, submission_id: attempt.id }),
      });
      if (!res.ok) throw new Error("submit failed");
      if (submissionAttemptRef.current?.id === attempt.id) {
        submissionAttemptRef.current = null;
      }
      // Reason: Demo confirmation represents a completed Calendly booking, not
      // merely a captured lead. Keep the accepted form values available so a
      // visitor who closes Calendly can reopen it without sending another email.
      if (action === "book_demo" && !multiEntity) {
        setSubmittedLead(lead);
        setStatus("awaiting_booking");
      } else {
        setStatus("success");
        form.reset();
      }
      window.fbq?.("track", "Lead", {}, { eventID: "waitlist_lead_" + attempt.id });
      trackMarketingEvent("marketing_lead_captured", {
        source: source ?? "waitlist",
        action: action ?? "waitlist",
      });
      onSuccess(lead);
    } catch {
      setStatus("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="wd"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wd-title"
      onMouseDown={(e) => {
        // Click outside the panel closes — but only on the scrim itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wd__panel" role="document">
        <button
          ref={closeBtnRef}
          type="button"
          className="wd__close"
          aria-label="Close"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>

        {status === "success" ? (
          <div className="wd__success">
            <div className="wd__eyebrow">
              {multiEntity || action !== "book_demo" ? "Recommendation request received" : "Demo booked"}
            </div>
            <h2 id="wd-title" className="wd__title">
              {multiEntity || action !== "book_demo"
                ? "Thank you. We’ll put together a recommendation for your business."
                : "Thank you. Your demo is booked."}
            </h2>
            <p className="wd__lede">
              {multiEntity || action !== "book_demo" ? (
                <>We'll follow up from <strong>support@buildwithporter.com</strong> with a tailored recommendation.</>
              ) : action === "book_demo" ? (
                "Calendly sent the meeting details to your inbox."
              ) : (
                <>We'll follow up from <strong>support@buildwithporter.com</strong> within one business day.</>
              )}
            </p>
            <button type="button" className="wd__submit" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="wd__eyebrow">Get in touch</div>
            <h2 id="wd-title" className="wd__title">
              {multiEntity ? "Get a multi-entity recommendation." : "Get a tailored recommendation."}
            </h2>
            <p className="wd__lede">
              {multiEntity
                ? "Answer two quick questions about your company group. We’ll email a recommendation based on what you share. No meeting to schedule."
                : "Tell us what you’re looking for. Share your email and a little about your business, and we’ll send a recommendation tailored to your needs. No meeting to schedule."}
            </p>

            <form className="wd__form" onSubmit={onSubmit} noValidate>
              {/* Honeypot — bots fill this; the /api/waitlist function 200s
                  silently if it has a value, so submitters never know. */}
              <input type="text" name="_honey" className="wd__honey" tabIndex={-1} autoComplete="off" />

              <Field
                label="Name"
                name="name"
                required
                inputRef={firstFieldRef}
                defaultValue={initialName}
              />
              <Field label="Email" name="email" type="email" required defaultValue={initialEmail} />
              <Field label="Company name" name="company" required />

              {multiEntity && (
                <>
                  <RadioGroup
                    label="How many companies or entities do you manage?"
                    name="entity_count"
                    options={["2–5", "6–10", "11–25", "26+"]}
                    required
                  />
                  <RadioGroup
                    label="What would make managing them easier?"
                    name="consolidation_need"
                    options={["Close faster each month", "See the whole group in one place", "Compare entities and drill into details", "Make reporting less complicated"]}
                    required
                  />
                </>
              )}

              {!multiEntity && action === "book_demo" && (
                <RadioGroup
                  label="Do you have an existing finance team?"
                  name="existing_finance_team"
                  options={["Yes", "No", "Just me"]}
                />
              )}

              <Textarea
                label="What would you like Porter's help with?"
                name="help_with"
                placeholder="Bookkeeping, AR, AP, payroll, tax prep, modeling, all of it…"
              />

              {status === "error" && (
                <div className="wd__error" role="alert">
                  Something went wrong. You can also reach us at{" "}
                  <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a>.
                </div>
              )}

              <button
              type={status === "awaiting_booking" ? "button" : "submit"}
                className="wd__submit"
                disabled={status === "submitting"}
                onClick={
                  status === "awaiting_booking" && submittedLead
                    ? () => onSuccess(submittedLead)
                    : undefined
                }
              >
                {status === "submitting"
                  ? "Sending…"
                  : status === "awaiting_booking"
                    ? "Open calendar again"
                    : "Send me a recommendation"}
              </button>
              <p className="wd__fineprint">
                By submitting you agree to receive a follow-up from the Porter team. We don't share your info.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  required,
  inputRef,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  defaultValue?: string;
}) {
  return (
    <label className="wd__field">
      <span className="wd__label">{label}{required && <em aria-hidden="true"> *</em>}</span>
      <input
        ref={inputRef}
        className="wd__input"
        name={name}
        type={type}
        required={required}
        autoComplete={autocompleteFor(name)}
        defaultValue={defaultValue}
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="wd__field">
      <span className="wd__label">{label}</span>
      <textarea
        className="wd__input wd__textarea"
        name={name}
        rows={3}
        placeholder={placeholder}
      />
    </label>
  );
}

function RadioGroup({
  label,
  name,
  options,
  required = false,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <fieldset className="wd__field wd__fieldset">
      <legend className="wd__label">{label}</legend>
      <div className="wd__radios">
        {options.map((opt) => (
          <label key={opt} className="wd__radio">
            <input type="radio" name={name} value={opt} required={required} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function autocompleteFor(name: string) {
  if (name === "name") return "name";
  if (name === "email") return "email";
  if (name === "company") return "organization";
  return "off";
}
