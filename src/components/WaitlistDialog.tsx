import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./WaitlistDialog.css";

// ─── Context ────────────────────────────────────────────────
// One dialog instance, opened from anywhere via `useWaitlist().open()`.

type Ctx = { open: () => void; close: () => void; isOpen: boolean };
const WaitlistCtx = createContext<Ctx | null>(null);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <WaitlistCtx.Provider value={{ open, close, isOpen }}>
      {children}
      <WaitlistDialog open={isOpen} onClose={close} />
    </WaitlistCtx.Provider>
  );
}

export function useWaitlist() {
  const ctx = useContext(WaitlistCtx);
  if (!ctx) throw new Error("useWaitlist must be used inside WaitlistProvider");
  return ctx;
}

// ─── Dialog ─────────────────────────────────────────────────

type Status = "idle" | "submitting" | "success" | "error";

function WaitlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
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
    if (open) setStatus("idle");
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // Build a clean JSON payload — better fit for our /api/waitlist
    // Vercel function (which relays via Resend to support@buildwithporter.com).
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      existing_finance_team: String(data.get("existing_finance_team") ?? ""),
      help_with: String(data.get("help_with") ?? ""),
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
      setStatus("success");
      form.reset();
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
            <div className="wd__eyebrow">You're in</div>
            <h2 id="wd-title" className="wd__title">
              Thank you. We'll be in touch shortly.
            </h2>
            <p className="wd__lede">
              We'll follow up from <strong>support@buildwithporter.com</strong> within one business day.
            </p>
            <button type="button" className="wd__submit" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="wd__eyebrow">Get in touch</div>
            <h2 id="wd-title" className="wd__title">
              Try Porter.
            </h2>
            <p className="wd__lede">
              Tell us a little about your business. We'll get back to you with the right next step.
            </p>

            <form className="wd__form" onSubmit={onSubmit} noValidate>
              {/* Honeypot — bots fill this; the /api/waitlist function 200s
                  silently if it has a value, so submitters never know. */}
              <input type="text" name="_honey" className="wd__honey" tabIndex={-1} autoComplete="off" />

              <Field label="Name" name="name" required inputRef={firstFieldRef} />
              <Field label="Email" name="email" type="email" required />
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
                type="submit"
                className="wd__submit"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending…" : "Try Porter"}
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
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
