import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("src/App.tsx");
const footer = read("src/primitives/Footer.tsx");
const seo = read("src/components/Seo.tsx");
const vercel = JSON.parse(read("vercel.json"));
const sitemap = read("public/sitemap.xml");
const llms = read("public/llms.txt");
const llmsFull = read("public/llms-full.txt");
const robots = read("public/robots.txt");
const notFound = read("public/404.md");
const markdownFunction = read("api/markdown.ts");
const openapiFunction = read("api/openapi.ts");

// Reason: The agent-readiness audit is machine-readable; these checks keep the published contracts from regressing silently.
assert.match(llms, /^# Porter\n\n>/, "llms.txt must follow the H1 + blockquote shape");
assert.match(llms, /## Services/, "llms.txt must include the service pages");
assert.match(llms, /## Developers/, "llms.txt must include developer resources");
assert.match(llms, /https:\/\/buildwithporter\.com\/books-cleanup/, "llms.txt must link books cleanup");
assert.match(llms, /https:\/\/buildwithporter\.com\/sale-ready/, "llms.txt must link sale-ready books");
assert.match(llms, /https:\/\/buildwithporter\.com\/llms-full\.txt/, "llms.txt must link the full content file");
assert.match(llms, /Do not infer hidden capabilities/, "llms.txt must keep the capability boundary");
assert.match(llms, /https:\/\/buildwithporter\.com\/developers/, "llms.txt must link the developer portal");
assert.match(llms, /https:\/\/buildwithporter\.com\/openapi\.json/, "llms.txt must link the OpenAPI proxy");
assert.match(llmsFull, /Source: https:\/\/buildwithporter\.com\/services/, "llms-full.txt must include the services page");
assert.match(llmsFull, /Source: https:\/\/buildwithporter\.com\/design/, "llms-full.txt must include industry pages");
assert.match(llmsFull, /Source: https:\/\/buildwithporter\.com\/blog\/how-much-cash-should-your-business-hold/, "llms-full.txt must include blog posts");
assert.doesNotMatch(llmsFull, /Source: https:\/\/buildwithporter\.com\/privacy-policy/, "llms-full.txt must skip legal pages");
assert.doesNotMatch(llmsFull, /Source: https:\/\/buildwithporter\.com\/terms-of-service/, "llms-full.txt must skip legal pages");

assert.match(notFound, /^# Porter 404\n\n>/, "404 body must be short Markdown");
assert.match(notFound, /sitemap\.xml/, "404 body must point agents to the sitemap");
assert.match(notFound, /llms\.txt/, "404 body must point agents to llms.txt");

assert.match(app, /path: "\/developers"/, "React routes must include /developers");
assert.doesNotMatch(app, /path: "\/docs"/, "React routes must not duplicate /docs");
// Reason: Campaign footers can prefix links with the main-site origin. The
// default homepage origin stays empty and the rendered destination is tested.
assert.match(footer, /homeOrigin = ""/, "Homepage footer must use an empty origin by default");
assert.match(footer, /href=(?:"\/developers"|\{`\$\{homeOrigin\}\/developers`\})/, "Homepage footer must link /developers");
assert.match(seo, /rel="describedby"/, "HTML pages must point agents to llms.txt");
assert.match(seo, /type="text\/markdown"/, "HTML pages must expose a markdown alternate");

assert.match(
  markdownFunction,
  /"Content-Type": "text\/markdown; charset=utf-8"/,
  "markdown negotiation must return text/markdown",
);
assert.match(
  markdownFunction,
  /Vary: "Accept, Accept-Encoding"/,
  "markdown negotiation must vary caches by Accept",
);
assert.match(markdownFunction, /markdownResponse\([\s\S]*404/, "markdown function must emit 404s");
assert.match(
  openapiFunction,
  /https:\/\/api\.buildwithporter\.com\/openapi\.json/,
  "OpenAPI proxy must use the canonical API schema",
);

// Reason: Match the full sitemap loc element so this validation cannot pass on
// a URL that only contains the Porter URL as an unsafe substring.
assert.match(
  sitemap,
  /<loc>https:\/\/buildwithporter\.com\/developers<\/loc>/,
  "sitemap must include /developers",
);
assert.doesNotMatch(
  sitemap,
  /<loc>https:\/\/buildwithporter\.com\/docs<\/loc>/,
  "sitemap must not include /docs",
);
assert.match(
  sitemap,
  /<loc>https:\/\/buildwithporter\.com\/blog\/how-much-cash-should-your-business-hold<\/loc>/,
  "sitemap must include the cash-buffer post",
);
assert.match(
  sitemap,
  /<loc>https:\/\/buildwithporter\.com\/blog\/how-to-plan-inventory-when-your-books-cant-see-your-operations<\/loc>/,
  "sitemap must include the inventory post",
);
assert.doesNotMatch(sitemap, /<changefreq>|<priority>/, "sitemap must not include changefreq or priority");
assert.equal(
  sitemap.match(/<url>/g)?.length,
  sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)?.length,
  "every sitemap url needs a date lastmod",
);
for (const agent of ["Bingbot", "Claude-SearchBot", "Claude-User", "DuckAssistBot", "Meta-ExternalAgent"]) {
  assert.match(robots, new RegExp(`User-agent: ${agent}\\nAllow: /`), `robots.txt must allow ${agent}`);
}
assert.match(robots, /Sitemap: https:\/\/buildwithporter\.com\/sitemap\.xml/, "robots.txt must advertise the sitemap");
assert.doesNotMatch(robots, /Disallow:/, "robots.txt must not disallow crawlers");
assert.match(read("scripts/indexnow-submit.mjs"), /sitemap\.xml/, "IndexNow must submit the sitemap URL set");

assert.deepEqual(vercel.routes.at(-2), { handle: "filesystem" }, "routes must serve existing static files before fallback 404");
assert.equal(vercel.routes.at(-1).status, 404, "fallback route must return HTTP 404");
assert.equal(vercel.routes.at(-1).dest, "/404.md", "fallback 404 route must use the Markdown body");
assert.ok(
  vercel.routes.some(
    (route) =>
      route.dest === "/api/markdown" &&
      route.has?.some((condition) => condition.type === "header" && condition.key === "accept"),
  ),
  "routes must negotiate Markdown on Accept: text/markdown",
);
assert.ok(
  vercel.routes.some(
    (route) =>
      route.src === "^/docs/?$" &&
      route.status === 301 &&
      route.headers?.Location === "https://buildwithporter.com/developers",
  ),
  "/docs must 301 to /developers",
);
assert.ok(
  vercel.routes.some((route) => route.src === "/openapi.json" && route.dest === "/api/openapi"),
  "canonical /openapi.json must proxy the API schema",
);
assert.ok(
  vercel.routes.some((route) => route.src === "/api/openapi.json" && route.dest === "/api/openapi"),
  "discoverable /api/openapi.json must proxy the API schema",
);

console.log("agent-readiness checks passed");
