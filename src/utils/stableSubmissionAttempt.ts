export type StableSubmissionAttempt = {
  id: string;
  fingerprint: string;
};

export function stableSubmissionAttempt(
  previous: StableSubmissionAttempt | null,
  fingerprint: string,
): StableSubmissionAttempt {
  // Reason: A timeout retry of the same canonical payload must reuse its
  // receipt id, but genuinely edited lead data must not be hidden by old dedupe.
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
