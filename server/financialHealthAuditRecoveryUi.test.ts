import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generate automatically routes an existing report into email proof", async () => {
  const source = await readFile(
    new URL("../src/pages/FinancialHealthAudit.tsx", import.meta.url),
    "utf8",
  );

  // Reason: Generate is the only lead-gate action. Keep this source-level guard
  // until the recovery view has a component harness that can assert the same
  // automatic routing and user-visible contract.
  assert.doesNotMatch(source, /Continue with Google/);
  assert.doesNotMatch(source, /startFinancialHealthAuditRecovery/);
  assert.match(source, /leadCaptureDestination/);
  assert.match(source, /Report already found/);
  assert.doesNotMatch(source, /View an earlier report/);
  assert.match(source, /Continue with email/);
});
