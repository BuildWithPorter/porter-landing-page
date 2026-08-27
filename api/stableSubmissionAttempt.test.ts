import assert from "node:assert/strict";
import { test } from "node:test";

import { stableSubmissionAttempt } from "../src/utils/stableSubmissionAttempt.ts";

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
