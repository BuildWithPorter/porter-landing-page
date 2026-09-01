// Reason: The transport must retain HTTP status as structured evidence so the
// controller can distinguish expired ownership proof from domain failures.
export class FinancialHealthAuditRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FinancialHealthAuditRequestError";
    this.status = status;
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
