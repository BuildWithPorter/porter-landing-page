import assert from "node:assert/strict";
import test from "node:test";
import { auditStylesheet } from "./financialHealthAuditSources.ts";

test("the completed report headline fits a laptop-sized first fold", async () => {
  // Reason (POR-2226): this assertion is about which duplicate rule wins, so it
  // must read the slices in barrel order. auditStylesheet() is that order; a
  // single slice or a directory glob would answer a different question.
  const stylesheet = await auditStylesheet();
  const headlineRules = [...stylesheet.matchAll(/\.fha-editorial-hero h1\s*\{(?<body>[^}]*)\}/g)];
  const reportOverride = headlineRules.at(-1)?.groups?.body;

  // Reason: This stylesheet deliberately has a base editorial rule followed by
  // the completed-report override. Guard the final cascade winner, including
  // its height-aware scale and cap, so the 92px incident cannot return.
  assert.match(reportOverride ?? "", /font-size:\s*clamp\(44px, min\(5vw, 9vh\), 72px\);/);
});

test("insight finding headers are white instead of cream or caution gold", async () => {
  const stylesheet = await auditStylesheet();

  // Reason: Ben asked to replace the yellow insight header text with white.
  // Guard the finding title, kicker, and caution stat so the cream paper token
  // and --audit-caution gold cannot slip back onto those headers.
  assert.match(
    stylesheet,
    /\.fha-editorial-finding-slide > header > span:first-child\s*\{[^}]*color:\s*#fff;/,
  );
  assert.match(
    stylesheet,
    /\.fha-editorial-finding-slide > h3\s*\{[^}]*color:\s*#fff;/,
  );
  assert.match(
    stylesheet,
    /\.fha-editorial-finding-slide\.is-caution > strong\s*\{[^}]*color:\s*#fff;/,
  );
});
