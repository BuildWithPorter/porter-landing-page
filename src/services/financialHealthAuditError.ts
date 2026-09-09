// Reason: The transport must retain HTTP status as structured evidence so the
// controller can distinguish expired ownership proof from domain failures.
export class FinancialHealthAuditRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details: Record<string, unknown> | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "FinancialHealthAuditRequestError";
    this.status = status;
    // Reason: Recovery races are retryable only when the API says so. Preserve
    // its machine contract so callers never broaden one recovery conflict into
    // special handling for every HTTP 409 or parse user-facing copy.
    this.code = code;
    this.details = details;
  }
}

export function isFinancialHealthAuditAccessError(
  error: unknown,
): error is FinancialHealthAuditRequestError {
  // Reason: The public API intentionally uses the same 404 for a missing audit
  // and an invalid/rotated bearer. Both mean this browser must prove email
  // ownership again; neither is a report-generation or QuickBooks failure.
  return error instanceof FinancialHealthAuditRequestError && error.status === 404;
}

export function isFinancialHealthAuditRecoveryConflict(
  error: unknown,
): error is FinancialHealthAuditRequestError {
  // Reason: A concurrent verified recovery invalidates this challenge but not
  // the owner's ability to retry. Both the dedicated code and retryable marker
  // are required so unrelated audit conflicts keep their existing behavior.
  return (
    error instanceof FinancialHealthAuditRequestError &&
    error.status === 409 &&
    error.code === "AUDIT_RECOVERY_CONFLICT" &&
    error.details?.retryable === true
  );
}

export function isFinancialHealthAuditGenerationLocked(
  error: unknown,
): error is FinancialHealthAuditRequestError {
  if (!(error instanceof FinancialHealthAuditRequestError) || error.status !== 409) {
    return false;
  }
  const reason = error.details?.reason;
  if (reason === "generation_in_progress" || reason === "audit_completed") return true;
  // Reason (POR-2452): Landing may deploy before typed `details.reason`. The
  // old 409 used this exact sentence for both generating and completed; GET
  // distinguishes them. Do not treat every conflict, or email-mismatch 409s,
  // as a locked generation.
  return (
    error.code === "conflict" &&
    error.message === "This audit can no longer be edited."
  );
}
