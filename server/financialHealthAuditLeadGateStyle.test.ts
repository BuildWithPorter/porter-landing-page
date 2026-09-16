import assert from "node:assert/strict";
import test from "node:test";
import { auditStylesheet } from "./financialHealthAuditSources.ts";

test("the email privacy note keeps breathing room below the input", async () => {
  // Reason (POR-2226): FinancialHealthAudit.css is an ordered barrel now, so read
  // the resolved slices rather than the barrel's own (rule-free) text.
  const stylesheet = await auditStylesheet();
  const helperRule = stylesheet.match(/\.fha-lead-gate__helper\s*\{(?<body>[^}]*)\}/)?.groups?.body;

  // Reason: The lead-gate note once sat directly against the email input.
  // Guard the explicit spacing hook so a reset or form refactor cannot silently
  // collapse these distinct elements back together.
  assert.match(helperRule ?? "", /margin-top:\s*12px;/);
});
