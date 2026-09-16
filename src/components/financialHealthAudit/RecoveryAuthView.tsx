/* Financial health audit email recovery, extracted from the page by POR-2226.
   Two states in one card: no challenge yet (offer to send a code) and a live
   challenge (enter the 6 digits). developmentCode only ever arrives from a
   loopback request, so rendering it is not a production leak. */

import { useEffect, useState, type FormEvent } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { trackFinancialHealthAudit as track } from "../../pages/useFinancialHealthAuditController";
import type { FinancialHealthAuditEmailChallenge } from "../../services/financialHealthAudit";

export function RecoveryAuthView({
  email,
  initialError,
  initialChallenge,
  onStartEmail,
  onVerifyEmail,
  onBack,
  titleRef,
}: {
  email: string;
  initialError: string;
  initialChallenge?: FinancialHealthAuditEmailChallenge;
  onStartEmail: () => Promise<FinancialHealthAuditEmailChallenge>;
  onVerifyEmail: (challengeId: string, code: string) => Promise<void>;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [challenge, setChallenge] = useState<FinancialHealthAuditEmailChallenge | null>(
    initialChallenge ?? null,
  );
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);

  const startEmail = async () => {
    if (status !== "idle") return;
    setStatus("sending");
    setError("");
    try {
      const nextChallenge = await onStartEmail();
      setChallenge(nextChallenge);
      setCode("");
      setStatus("idle");
      track("financial_health_audit_recovery_code_sent");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "Porter could not send the verification code. Try again.",
      );
      track("financial_health_audit_recovery_auth_failed");
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!challenge || status !== "idle" || code.length !== 6) return;
    setStatus("verifying");
    setError("");
    try {
      await onVerifyEmail(challenge.challengeId, code);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "That code could not be verified.");
      track("financial_health_audit_recovery_code_failed");
    }
  };

  useEffect(() => {
    track("financial_health_audit_recovery_auth_viewed");
  }, []);

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-lead-gate fha-recovery-auth">
        <div className="fha-lead-gate__intro">
          <div className="fha-lead-gate__copy">
            {/* Reason: Returning visitors may have unfinished saved work, not a report yet. */}
            <p className="fha-lead-gate__eyebrow">Your saved audit is here</p>
            <h1 ref={titleRef} tabIndex={-1}>{challenge ? "Check your inbox." : "Welcome back."}</h1>
            <p>
              {challenge ? (
                <>
                  Enter the 6-digit code sent to <strong>{email}</strong>. Delivery can take up to a minute.
                </>
              ) : (
                <>We’ve saved your audit for <strong>{email}</strong>. Verify your email
                to pick up where you left off.</>
              )}
            </p>
          </div>
          <div className="fha-lead-gate__folio fha-recovery-auth__folio" aria-hidden="true">
            <span>Protected audit</span>
            <MaterialIcon name="lock" />
            <p>Your QuickBooks data and uploaded documents stay private.</p>
          </div>
        </div>

        <div className="fha-lead-gate__form">
          {challenge ? (
            <form className="fha-recovery-code" onSubmit={submitCode}>
              <label htmlFor="fha-recovery-code">Verification code</label>
              <div className="fha-recovery-code__entry">
                <div className="fha-recovery-code__boxes" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => <span key={index}>{code[index] ?? ""}</span>)}
                </div>
                <input
                  id="fha-recovery-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-describedby={error ? "fha-recovery-error" : undefined}
                  autoFocus
                />
              </div>
              {challenge.developmentCode ? (
                <p className="fha-recovery-code__development">Local test code: <strong>{challenge.developmentCode}</strong></p>
              ) : null}
              {error ? <p id="fha-recovery-error" className="fha-lead-gate__error" role="alert">{error}</p> : null}
              <button type="submit" className="fha-button fha-button--primary fha-recovery-auth__method" disabled={status !== "idle" || code.length !== 6}>
                {status === "verifying" ? "Verifying…" : "Verify and continue"}
                <MaterialIcon name="arrow_forward" />
              </button>
              <div className="fha-recovery-code__links">
                <button type="button" className="fha-recovery-code__link" onClick={() => void startEmail()} disabled={status !== "idle"}>Resend code</button>
                <button type="button" className="fha-recovery-code__link" onClick={onBack} disabled={status !== "idle"}>Use a different email</button>
              </div>
            </form>
          ) : (
            <>
              <div className="fha-recovery-auth__notice">
                <MaterialIcon name="verified_user" />
                <p>Verify the email on this report to continue.</p>
              </div>
              {error ? <p className="fha-lead-gate__error" role="alert">{error}</p> : null}
              <div id="recovery-auth-methods" className="fha-recovery-auth__methods">
                <button type="button" className="fha-button fha-button--primary fha-recovery-auth__method" onClick={() => void startEmail()} disabled={status !== "idle"}>
                  {/* Reason: This action proves ownership of the entered email,
                      so the label should name that security step directly. */}
                  {status === "sending" ? "Sending code…" : "Verify my email"}
                  <MaterialIcon name="arrow_forward" />
                </button>
                <button type="button" className="fha-button fha-button--quiet fha-recovery-auth__different" onClick={onBack} disabled={status !== "idle"}>
                  Use a different email
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
