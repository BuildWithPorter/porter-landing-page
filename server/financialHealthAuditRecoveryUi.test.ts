import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("existing audit recovery offers email verification without an app auth route", async () => {
  const source = await readFile(
    new URL("../src/pages/FinancialHealthAudit.tsx", import.meta.url),
    "utf8",
  );

  // Reason: Google recovery hands a public audit visitor into the full Porter
  // app. Keep this source-level boundary guard until the recovery view has a
  // component test harness that can assert the same user-visible contract.
  assert.doesNotMatch(source, /Continue with Google/);
  assert.doesNotMatch(source, /startFinancialHealthAuditRecovery/);
  assert.match(source, /Continue with email/);
});
