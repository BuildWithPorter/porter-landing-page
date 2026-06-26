#!/usr/bin/env node
/**
 * IndexNow URL submission.
 *
 * IndexNow is a protocol by Microsoft/Yandex that lets a site instantly
 * notify search engines about URL changes. A single POST hits Bing (which
 * powers ChatGPT search and Copilot), Yandex, and Seznam — Google does
 * not currently honor it but the upside is still substantial for AI
 * citation.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs                 # submits all routes
 *   node scripts/indexnow-submit.mjs /blog/foo-bar   # submits one URL
 *
 * The key file must already be deployed at
 *   https://buildwithporter.com/<KEY>.txt
 * containing only the key string. (See public/1638a62bf20bdd60528db8b58414006c.txt.)
 *
 * Run this after publishing a new blog article to push it to search
 * engines instantly instead of waiting for an organic crawl.
 */

const HOST = "buildwithporter.com";
const KEY = "1638a62bf20bdd60528db8b58414006c";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

const DEFAULT_PATHS = [
  "/",
  "/blog",
  "/blog/how-to-switch-bookkeepers",
  "/blog/what-does-ai-bookkeeping-actually-mean",
  "/careers",
  "/slack",
  "/support",
  "/security",
  "/privacy-policy",
  "/terms-of-service",
  "/legal/subprocessors",
];

const argPaths = process.argv.slice(2);
const paths = argPaths.length > 0 ? argPaths : DEFAULT_PATHS;
const urlList = paths.map((p) => (p.startsWith("http") ? p : `https://${HOST}${p}`));

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
};

console.log(`[indexnow] submitting ${urlList.length} URL(s) to ${ENDPOINT}`);
for (const u of urlList) console.log(`  · ${u}`);

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(`\n[indexnow] HTTP ${res.status} ${res.statusText}`);
if (text) console.log(`[indexnow] response: ${text}`);

// 200 = accepted. 202 = accepted but additional validation pending.
// 400 = bad request. 403 = key not valid (file missing/wrong content).
// 422 = URLs don't belong to host. 429 = too many requests.
if (res.status === 200 || res.status === 202) {
  console.log("[indexnow] ✓ submitted successfully");
  process.exit(0);
}
console.error("[indexnow] ✗ submission failed");
process.exit(1);
