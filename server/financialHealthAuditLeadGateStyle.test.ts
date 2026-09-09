import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the email privacy note keeps breathing room below the input", async () => {
  const stylesheet = await readFile(
    new URL("../src/pages/FinancialHealthAudit.css", import.meta.url),
    "utf8",
  );
  const helperRule = stylesheet.match(/\.fha-lead-gate__helper\s*\{(?<body>[^}]*)\}/)?.groups?.body;

  // Reason: The lead-gate note once sat directly against the email input.
  // Guard the explicit spacing hook so a reset or form refactor cannot silently
  // collapse these distinct elements back together.
  assert.match(helperRule ?? "", /margin-top:\s*12px;/);
});
