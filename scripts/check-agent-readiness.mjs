import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("src/App.tsx");
const footer = read("src/primitives/Footer.tsx");
const seo = read("src/components/Seo.tsx");
const vercel = JSON.parse(read("vercel.json"));
const sitemap = read("public/sitemap.xml");
const llms = read("public/llms.txt");
const notFound = read("public/404.md");
const markdownFunction = read("api/markdown.ts");
const openapiFunction = read("api/openapi.ts");

// Reason: The agent-readiness audit is machine-readable; these checks keep the published contracts from regressing silently.
assert.match(llms, /^# Porter\n\n>/, "llms.txt must follow the H1 + blockquote shape");
assert.match(llms, /## Agent Resources/, "llms.txt must include agent resources");
assert.match(llms, /When to use Porter:/, "llms.txt must include when-to-use guidance");
assert.match(llms, /https:\/\/buildwithporter\.com\/developers/, "llms.txt must link the developer portal");
assert.match(llms, /https:\/\/buildwithporter\.com\/openapi\.json/, "llms.txt must link the OpenAPI proxy");

assert.match(notFound, /^# Porter 404\n\n>/, "404 body must be short Markdown");
assert.match(notFound, /sitemap\.xml/, "404 body must point agents to the sitemap");
assert.match(notFound, /llms\.txt/, "404 body must point agents to llms.txt");

assert.match(app, /path: "\/developers"/, "React routes must include /developers");
assert.match(app, /path: "\/docs"/, "React routes must include /docs");
assert.match(footer, /href="\/developers"/, "Homepage footer must link /developers");
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

assert.ok(sitemap.includes("https://buildwithporter.com/developers"), "sitemap must include /developers");
assert.ok(sitemap.includes("https://buildwithporter.com/docs"), "sitemap must include /docs");

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
  vercel.routes.some((route) => route.src === "/openapi.json" && route.dest === "/api/openapi"),
  "canonical /openapi.json must proxy the API schema",
);
assert.ok(
  vercel.routes.some((route) => route.src === "/api/openapi.json" && route.dest === "/api/openapi"),
  "discoverable /api/openapi.json must proxy the API schema",
);

console.log("agent-readiness checks passed");
