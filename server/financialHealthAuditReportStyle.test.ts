import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the completed report headline fits a laptop-sized first fold", async () => {
  const stylesheet = await readFile(
    new URL("../src/pages/FinancialHealthAudit.css", import.meta.url),
    "utf8",
  );
  const headlineRules = [...stylesheet.matchAll(/\.fha-editorial-hero h1\s*\{(?<body>[^}]*)\}/g)];
  const reportOverride = headlineRules.at(-1)?.groups?.body;

  // Reason: This stylesheet deliberately has a base editorial rule followed by
  // the completed-report override. Guard the final cascade winner, including
  // its height-aware scale and cap, so the 92px incident cannot return.
  assert.match(reportOverride ?? "", /font-size:\s*clamp\(44px, min\(5vw, 9vh\), 72px\);/);
});

test("insight finding headers are white instead of cream or caution gold", async () => {
  const stylesheet = await readFile(
    new URL("../src/pages/FinancialHealthAudit.css", import.meta.url),
    "utf8",
  );

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
