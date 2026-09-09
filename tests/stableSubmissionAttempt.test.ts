import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canonicalWaitlistLead,
  stableSubmissionAttempt,
} from "../src/utils/stableSubmissionAttempt.ts";

// Reason: This test lives outside api/ because Vercel treats that directory as
// deployable serverless functions, including files whose names end in .test.ts.

test("the same payload retry reuses its submission id", () => {
  const first = stableSubmissionAttempt(null, "same-payload");
  const retry = stableSubmissionAttempt(first, "same-payload");

  assert.equal(retry.id, first.id);
});

test("edited payload gets a new submission id", () => {
  const first = stableSubmissionAttempt(null, "original-payload");
  const edited = stableSubmissionAttempt(first, "edited-payload");

  assert.notEqual(edited.id, first.id);
});

test("canonically equivalent lead values reuse a submission id", () => {
  const original = canonicalWaitlistLead({
    name: " Ada ",
    email: "ADA@EXAMPLE.COM ",
    company: " Example Co ",
    existing_finance_team: " Yes ",
    help_with: " Bookkeeping ",
    _honey: "",
  });
  const equivalent = canonicalWaitlistLead({
    name: "Ada",
    email: "ada@example.com",
    company: "Example Co",
    existing_finance_team: "Yes",
    help_with: "Bookkeeping",
    _honey: "",
  });
  const first = stableSubmissionAttempt(null, JSON.stringify(original));
  const retry = stableSubmissionAttempt(first, JSON.stringify(equivalent));

  assert.equal(retry.id, first.id);
});

test("the fallback still generates an RFC 4122 UUIDv4", () => {
  const originalCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(0) },
  });
  try {
    const attempt = stableSubmissionAttempt(null, "fallback-payload");
    assert.equal(attempt.id, "00000000-0000-4000-8000-000000000000");
  } finally {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  }
});
