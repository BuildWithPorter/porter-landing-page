import assert from "node:assert/strict";
import test from "node:test";

import {
  leadCaptureDestination,
  normalizeStoredAuditLocation,
} from "../src/pages/financialHealthAuditState.ts";

test("lead capture recovers saved work or continues to intake", () => {
  // Reason: New contacts should enter the questionnaire without starting AI.
  assert.equal(leadCaptureDestination(true), "recovery");
  assert.equal(leadCaptureDestination(false), "intake");
  assert.equal(leadCaptureDestination(undefined), "intake");
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
