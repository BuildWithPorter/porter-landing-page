import assert from "node:assert/strict";
// Reason: This file sits in `tests/`, which `npm test` runs under VITEST
// (`vitest run tests src`), not `node --test` (that stage only globs
// `server/*.test.ts`). It used to import `test` from "node:test", so vitest
// found no suite and failed the file, while node's runner never ran it at all
// -- it was dead under both. It also imported `canonicalWaitlistLead`, a helper
// that no longer exists, which made it a hard link error under node. Both went
// unnoticed because the landing CI ran no tests. Keep this on vitest.
import { test } from "vitest";

import { stableSubmissionAttempt } from "../src/utils/stableSubmissionAttempt.ts";

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

// Reason: A "canonically equivalent lead values reuse a submission id" case used
// to live here, testing `canonicalWaitlistLead` (added e337053, 2026-08-27).
// That helper was later folded inline into WaitlistDialog's submit handler,
// which still trims every field and lowercases the email before fingerprinting,
// so the duplicate-lead protection it guarded is intact. Its two halves are
// now covered separately and no third copy is needed:
//   * normalization -> src/components/WaitlistDialog.test.tsx, which types
//     "  ADA@EXAMPLE.COM  " and asserts the posted payload is "ada@example.com";
//   * equal payload => same id -> "the same payload retry reuses its
//     submission id" above.
// If WaitlistDialog ever stops normalizing before fingerprinting, the component
// test is the one that fails.

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
