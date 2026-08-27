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
    : { id: newSubmissionId(), fingerprint };
}

function newSubmissionId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // Reason: Some supported browsers expose secure random bytes but not the
  // randomUUID convenience API. Keep retry protection available there while
  // still generating an RFC 4122 UUIDv4 from browser cryptographic entropy.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
