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
    : { id: crypto.randomUUID(), fingerprint };
}
