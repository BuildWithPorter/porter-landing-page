import assert from "node:assert/strict";
import test from "node:test";

import {
  leadCaptureDestination,
  normalizeStoredAuditLocation,
} from "../src/pages/financialHealthAuditState.ts";

test("lead capture automatically selects recovery only for an existing report", () => {
  assert.equal(leadCaptureDestination(true), "recovery");
  assert.equal(leadCaptureDestination(false), "generation");
  assert.equal(leadCaptureDestination(undefined), "generation");
});

test("recovered report keeps its report flow after refresh with empty answers", () => {
  const restored = normalizeStoredAuditLocation({
    answers: {},
    path: "documents",
    stepId: "complete-d",
    hasReport: true,
  });

  assert.deepEqual(restored, { path: "documents", stepId: "complete-d" });
});

test("unfinished sessions still derive their flow from questionnaire answers", () => {
  const restored = normalizeStoredAuditLocation({
    answers: {},
    path: "documents",
    stepId: "complete-d",
    hasReport: false,
  });

  assert.deepEqual(restored, { path: null, stepId: "business-type" });
});
