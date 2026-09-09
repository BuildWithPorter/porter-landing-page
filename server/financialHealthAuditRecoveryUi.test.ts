import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generate automatically routes an existing report into email proof without offering a rerun", async () => {
  const source = await readFile(
    new URL("../src/pages/FinancialHealthAudit.tsx", import.meta.url),
    "utf8",
  );

  // The component suite owns routing behavior. These source guards only protect
  // the visible recovery contract and prevent a duplicate report action.
  assert.doesNotMatch(source, /Continue with Google/);
  assert.doesNotMatch(source, /startFinancialHealthAuditRecovery/);
  // Reason: Recovery covers both completed reports and unfinished retained work.
  assert.match(source, /Your saved audit is here/);
  assert.doesNotMatch(source, /View an earlier report/);
  assert.match(source, /Verify my email/);
  // Reason: The completed report is the recovery target for this email. A
  // report-level rerun action would recreate the duplicate path this flow removes.
  assert.doesNotMatch(source, /Run (?:my|the) audit again/i);
});
