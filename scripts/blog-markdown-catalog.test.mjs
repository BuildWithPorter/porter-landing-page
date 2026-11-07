import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generateCatalogSource } from "./blog-markdown-catalog.mjs";

test("blog markdown catalog matches the post files", () => {
  const current = readFileSync(new URL("../src/blog/markdownPages.ts", import.meta.url), "utf8");
  assert.equal(current, generateCatalogSource());
});
