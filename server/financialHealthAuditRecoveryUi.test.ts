import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("explicit audit recovery offers email proof without an existence signal", async () => {
  const source = await readFile(
    new URL("../src/pages/FinancialHealthAudit.tsx", import.meta.url),
    "utf8",
  );

  // Reason: Normal generation must never auto-route from a pre-proof existence
  // bit. Keep this source-level guard until the recovery view has a component
  // harness that can assert the same user-visible contract.
  assert.doesNotMatch(source, /Continue with Google/);
  assert.doesNotMatch(source, /startFinancialHealthAuditRecovery/);
  assert.doesNotMatch(source, /leadCaptureDestination/);
  assert.doesNotMatch(source, /Report already found/);
  assert.match(source, /View an earlier report/);
  assert.match(source, /Continue with email/);
});
