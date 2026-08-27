export type StableSubmissionAttempt = {
  id: string;
  fingerprint: string;
};

export type WaitlistLeadInput = {
  name: string;
  email: string;
  company: string;
  existing_finance_team: string;
  help_with: string;
  source?: "financial_health_audit";
  action?: "book_demo";
  _honey: string;
};

export function canonicalWaitlistLead(input: WaitlistLeadInput): WaitlistLeadInput {
  // Reason: The retry fingerprint must describe the same canonical values the
  // backend receives; casing or whitespace alone must not create duplicate mail.
  return {
    ...input,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    company: input.company.trim(),
    existing_finance_team: input.existing_finance_team.trim(),
    help_with: input.help_with.trim(),
  };
}

export function stableSubmissionAttempt(
  previous: StableSubmissionAttempt | null,
  fingerprint: string,
): StableSubmissionAttempt {
  // Reason: A timeout retry of the same payload must reuse its receipt id, but
  // edited lead data is a new submission and must not be hidden by old dedupe.
  return previous?.fingerprint === fingerprint
    ? previous
    : { id: crypto.randomUUID(), fingerprint };
}
