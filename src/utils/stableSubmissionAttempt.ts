export type StableSubmissionAttempt = {
  id: string;
  fingerprint: string;
};

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
