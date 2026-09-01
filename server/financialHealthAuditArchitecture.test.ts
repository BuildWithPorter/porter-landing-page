import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("the audit controller has one QuickBooks transport boundary", async () => {
  const [page, controller, service] = await Promise.all([
    source("../src/pages/FinancialHealthAudit.tsx"),
    source("../src/pages/useFinancialHealthAuditController.ts"),
    source("../src/services/financialHealthAudit.ts"),
  ]);

  // The page renders state; it does not start, poll, or interpret QBO work.
  assert.doesNotMatch(page, /waitForFinancialHealthQuickBooksConnection/);
  assert.doesNotMatch(page, /startFinancialHealthQuickBooksConnection/);

  // Questionnaire monitoring and report gating share this retained promise.
  assert.equal(
    controller.match(/waitForFinancialHealthQuickBooksConnection\(/g)?.length,
    1,
  );
  assert.equal(
    controller.match(/startFinancialHealthQuickBooksConnection\(/g)?.length,
    1,
  );
  assert.doesNotMatch(controller, /quickbooks_status|\/quickbooks\/status/);

  // HTTP routing and polling remain owned by the existing typed service.
  assert.equal(service.match(/action: "quickbooks_status"/g)?.length, 1);
});
