import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditFeatureSource } from "./financialHealthAuditSources.ts";

const MICHAEL_EVENT = "https://calendly.com/michael-buildwithporter/porter";

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("the audit retains scheduling while the landing page invites a conversation", async () => {
  // Reason (POR-2226): the audit's booking call sits in EditorialReportView now,
  // not in the page. Read the whole feature so this guard cannot be defeated by
  // moving the URL one file over.
  const [calendly, nav, audit] = await Promise.all([
    source("../src/lib/calendly.ts"),
    source("../src/primitives/Nav.tsx"),
    auditFeatureSource(),
  ]);

  // Reason: The general landing CTA is intentionally low-commitment, while the audit
  // has a separately designed scheduling flow that still uses the shared event URL.
  assert.match(calendly, new RegExp(`export const PORTER_DEMO_CALENDLY_URL = "${MICHAEL_EVENT}"`));
  assert.doesNotMatch(nav, /PORTER_DEMO_CALENDLY_URL|openCalendlyPopup/);
  assert.match(nav, /Talk to Porter/);
  assert.match(audit, /PORTER_DEMO_CALENDLY_URL/);
  assert.doesNotMatch(nav, /https:\/\/calendly\.com\//);
  assert.doesNotMatch(audit, /https:\/\/calendly\.com\//);
  assert.doesNotMatch(`${calendly}\n${nav}\n${audit}`, /daniel-buildwithporter/);
});
