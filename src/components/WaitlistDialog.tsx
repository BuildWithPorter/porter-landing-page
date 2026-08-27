import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./WaitlistDialog.css";

// ─── Context ────────────────────────────────────────────────
// One dialog instance, opened from anywhere via `useWaitlist().open()`.

export type WaitlistOpenOptions = {
  source?: "financial_health_audit";
  action?: "book_demo";
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
  initialName,
  initialEmail,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  source?: "financial_health_audit";
  action?: "book_demo";
  initialName?: string;
  initialEmail?: string;
  onSuccess: (lead: WaitlistLead) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [submittedLead, setSubmittedLead] = useState<WaitlistLead | null>(null);
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
    const data = new FormData(form);
    // Reason: The Calendly handoff must reuse the normalized lead that Porter
    // accepted, so the immediate email and prefilled booking cannot diverge.
    const lead = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim().toLowerCase(),
      company: String(data.get("company") ?? "").trim(),
      existingFinanceTeam: String(data.get("existing_finance_team") ?? "").trim(),
      helpWith: String(data.get("help_with") ?? "").trim(),
    };
    // Build a clean JSON payload — better fit for our /api/waitlist
    // Vercel function (which relays via Resend to support@buildwithporter.com).
    const payload = {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      existing_finance_team: lead.existingFinanceTeam,
      help_with: lead.helpWith,
      source,
      action,
      _honey: String(data.get("_honey") ?? ""),
    };
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("submit failed");
      // Reason: Demo confirmation represents a completed Calendly booking, not
      // merely a captured lead. Keep the accepted form values available so a
      // visitor who closes Calendly can reopen it without sending another email.
      if (action === "book_demo") {
        setSubmittedLead(lead);
        setStatus("awaiting_booking");
      } else {
        setStatus("success");
        form.reset();
      }
      window.fbq?.("track", "Lead");
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
              {action === "book_demo" ? "Demo booked" : "Demo requested"}
            </div>
            <h2 id="wd-title" className="wd__title">
              {action === "book_demo"
                ? "Thank you. Your demo is booked."
                : "Thank you. We’ll be in touch shortly."}
            </h2>
            <p className="wd__lede">
              {action === "book_demo" ? (
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
              Book a demo.
            </h2>
            <p className="wd__lede">
              Tell us a little about your business. We’ll follow up with the right next step.
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

              <RadioGroup
                label="Do you have an existing finance team?"
                name="existing_finance_team"
                options={["Yes", "No", "Just me"]}
              />

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
                    : "Book my demo"}
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
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <fieldset className="wd__field wd__fieldset">
      <legend className="wd__label">{label}</legend>
      <div className="wd__radios">
        {options.map((opt) => (
          <label key={opt} className="wd__radio">
            <input type="radio" name={name} value={opt} />
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
