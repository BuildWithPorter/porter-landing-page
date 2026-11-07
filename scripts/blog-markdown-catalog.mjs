#!/usr/bin/env node
/**
 * Builds src/blog/markdownPages.ts from src/blog/posts/*.md.
 *
 * The markdown alternate is an edge function and cannot read the post files
 * at request time, so the catalog is bundled. Run this after adding a post,
 * and the matching test fails if the catalog is stale.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const postsDir = join(root, "src/blog/posts");
const outFile = join(root, "src/blog/markdownPages.ts");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("blog post is missing frontmatter");
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    else if (/^\[.*\]$/.test(value)) value = JSON.parse(value);
    data[kv[1]] = value;
  }
  return { data, body: match[2].trim() };
}

export function readBlogMarkdownPages() {
  return readdirSync(postsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const parsed = parseFrontmatter(readFileSync(join(postsDir, name), "utf8"));
      const faqs = Array.isArray(parsed.data.faqs) ? parsed.data.faqs : [];
      return {
        slug: String(parsed.data.slug ?? ""),
        title: String(parsed.data.title ?? ""),
        description: String(parsed.data.description ?? ""),
        summary: typeof parsed.data.summary === "string" ? parsed.data.summary : "",
        date: String(parsed.data.date ?? ""),
        author: typeof parsed.data.author === "string" ? parsed.data.author : "",
        body: parsed.body,
        faqs: faqs.map((item) => ({ q: String(item.q), a: String(item.a) })),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug.localeCompare(b.slug)));
}

export function generateCatalogSource() {
  const pages = readBlogMarkdownPages();
  for (const page of pages) {
    if (!page.slug || !page.title || !page.date) {
      throw new Error(`blog catalog entry is missing slug, title, or date: ${page.slug}`);
    }
  }
  return `// Generated from src/blog/posts/*.md by scripts/blog-markdown-catalog.mjs.
// Do not edit by hand. Run: node scripts/blog-markdown-catalog.mjs

export type BlogMarkdownFaq = {
  q: string;
  a: string;
};

export type BlogMarkdownPage = {
  slug: string;
  title: string;
  description: string;
  summary: string;
  date: string;
  author: string;
  body: string;
  faqs: BlogMarkdownFaq[];
};

export const BLOG_MARKDOWN_PAGES: BlogMarkdownPage[] = ${JSON.stringify(pages, null, 2)};
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(outFile, generateCatalogSource());
  console.log(`wrote ${outFile}`);
}
