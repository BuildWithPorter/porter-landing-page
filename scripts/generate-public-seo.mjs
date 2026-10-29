#!/usr/bin/env node
/**
 * Writes public/sitemap.xml and public/llms-full.txt.
 *
 * Sitemap URLs come from the public routes plus blog frontmatter. lastmod is
 * the newest git commit date of the route's source files. A shallow checkout
 * that cannot see a file's history keeps the lastmod already in the sitemap.
 * changefreq and priority are omitted. /docs and /deck are excluded.
 *
 * llms-full.txt concatenates the Markdown the site serves for service,
 * industry, and use-case URLs, plus the blog Markdown those pages render.
 * Legal pages are left out.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://buildwithporter.com";
const read = (path) => readFileSync(join(root, path), "utf8");

const LEGAL = new Set(["/privacy-policy", "/terms-of-service", "/legal/subprocessors", "/sms-consent"]);
const SERVICE_PATHS = new Set(["/services", "/books-cleanup", "/sale-ready", "/multi-entity", "/financial-health-audit"]);

function gitDate(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: root, encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

function existingLastmods() {
  const map = new Map();
  const file = join(root, "public/sitemap.xml");
  if (!existsSync(file)) return map;
  const xml = readFileSync(file, "utf8");
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/);
    const last = block[1].match(/<lastmod>([^<]+)<\/lastmod>/);
    if (loc && last) map.set(loc[1], last[1]);
  }
  return map;
}

function quoted(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]*)"`, "m"));
  if (!match) throw new Error(`blog frontmatter is missing ${key}`);
  return match[1];
}

function blogPosts() {
  const dir = join(root, "src/blog/posts");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const file = `src/blog/posts/${name}`;
      const raw = read(file);
      const parsed = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!parsed) throw new Error(`bad frontmatter in ${file}`);
      const faqsMatch = parsed[1].match(/^faqs:\s*(\[.*\])\s*$/m);
      let faqs = [];
      if (faqsMatch) faqs = JSON.parse(faqsMatch[1]);
      return {
        file,
        slug: quoted(parsed[1], "slug"),
        date: quoted(parsed[1], "date"),
        title: quoted(parsed[1], "title"),
        description: quoted(parsed[1], "description"),
        body: parsed[2].trim(),
        faqs,
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function useCaseSlugs() {
  return [...read("src/content/useCases.ts").matchAll(/"slug":\s*"([^"]+)"/g)].map((match) => match[1]);
}

function industries() {
  return readdirSync(join(root, "src/industries"))
    .filter((name) => name.endsWith(".ts") && name !== "index.ts" && name !== "types.ts")
    .map((name) => {
      const file = `src/industries/${name}`;
      const path = read(file).match(/path:\s*"(\/[^"]+)"/);
      if (!path) throw new Error(`no industry path in ${file}`);
      return { file, path: path[1] };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function collectEntries() {
  const posts = blogPosts();
  const slugs = useCaseSlugs();
  const industryPages = industries();
  const entries = [];
  const add = (path, files, fallback = null) => entries.push({ path, files, fallback });

  add("/", ["src/App.tsx", "src/sections/HeroChart.tsx", "src/content/faq.ts"]);
  add("/what-we-solve", ["src/pages/SitePages.tsx", "src/sections/Challenges.tsx"]);
  add("/services", ["src/content/sitePages.ts", "src/pages/SitePages.tsx"]);
  add("/why-porter", ["src/pages/SitePages.tsx", "src/content/faq.ts"]);
  add("/use-cases", ["src/pages/UseCases.tsx", "src/content/useCases.ts"]);
  for (const slug of slugs) add(`/use-cases/${slug}`, ["src/content/useCases.ts"]);
  add("/multi-entity", ["src/pages/MultiEntity.tsx"]);
  add("/sale-ready", ["src/pages/SaleReady.tsx"]);
  add("/books-cleanup", ["src/pages/BooksCleanup.tsx", "src/content/booksCleanupFaq.ts"]);
  add("/financial-health-audit", ["src/pages/FinancialHealthAudit.tsx"]);
  for (const industry of industryPages) add(industry.path, [industry.file]);
  add("/blog", ["src/pages/Blog.tsx", "src/blog/posts.ts"]);
  for (const post of posts) add(`/blog/${post.slug}`, [post.file], post.date);
  add("/careers", ["src/pages/Careers.tsx"]);
  add("/slack", ["src/pages/SlackApp.tsx"]);
  add("/support", ["src/pages/Support.tsx"]);
  add("/developers", ["src/pages/Developers.tsx"]);
  add("/sms-consent", ["src/pages/SmsConsent.tsx"]);
  add("/security", ["src/pages/Security.tsx", "src/legal/securityContent.ts"]);
  add("/privacy-policy", ["src/pages/PrivacyPolicy.tsx"]);
  add("/terms-of-service", ["src/pages/TermsOfService.tsx"]);
  add("/legal/subprocessors", ["src/pages/SubProcessors.tsx"]);

  return { entries, posts, slugs, industryPages };
}

export function isLlmsFullPath(path, industryPaths) {
  if (LEGAL.has(path)) return false;
  if (SERVICE_PATHS.has(path)) return true;
  if (path === "/use-cases" || path.startsWith("/use-cases/")) return true;
  if (path === "/blog" || path.startsWith("/blog/")) return true;
  return industryPaths.has(path);
}

function absolute(path) {
  return path === "/" ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}

function lastmodFor(entry, previous) {
  const dates = entry.files.map(gitDate).filter(Boolean).sort();
  if (dates.length) return dates[dates.length - 1];
  return previous.get(absolute(entry.path)) || entry.fallback || new Date().toISOString().slice(0, 10);
}

export function sitemapXml(entries) {
  const previous = existingLastmods();
  const urls = entries.map((entry) => {
    const lastmod = lastmodFor(entry, previous);
    return `  <url>\n    <loc>${absolute(entry.path)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function blogIndex(posts) {
  const lines = posts.map((post) => `- [${post.title}](${ORIGIN}/blog/${post.slug}): ${post.description}`);
  return `# The CFO Playbook\n\nPlain-language writing on bookkeeping, accounting, AR, AP, and the parts of small-business finance nobody else explains honestly. The CFO playbook, from Porter.\n\n${lines.join("\n")}\n`;
}

function postDocument(post) {
  const faqs = post.faqs.flatMap((item) => [`### ${item.q}`, item.a, ""]);
  const faqBlock = faqs.length ? `\n## Common questions\n\n${faqs.join("\n")}\n` : "";
  return `# ${post.title}\n\n${post.description}\n\n${post.body}\n${faqBlock}`;
}

export async function llmsFull({ entries, posts, industryPages }) {
  const { createServer } = await import("vite");
  const server = await createServer({
    root,
    configFile: join(root, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const mod = await server.ssrLoadModule("/api/markdown.ts");
    const industryPaths = new Set(industryPages.map((industry) => industry.path));
    const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
    const parts = [];
    for (const entry of entries) {
      if (!isLlmsFullPath(entry.path, industryPaths)) continue;
      let markdown;
      if (entry.path === "/blog") markdown = blogIndex(posts);
      else if (entry.path.startsWith("/blog/")) {
        const post = postsBySlug.get(entry.path.slice("/blog/".length));
        if (!post) throw new Error(`missing blog source for ${entry.path}`);
        markdown = postDocument(post);
      } else {
        markdown = mod.markdownDocument(entry.path);
        if (!markdown) throw new Error(`no markdown response for ${entry.path}`);
      }
      parts.push(`${markdown.trim()}\n\nSource: ${absolute(entry.path)}`);
    }
    return `# Porter full content\n\n> Concatenated Markdown for Porter service, industry, use-case, and blog pages. Legal pages are not included.\n\n${parts.join("\n\n---\n\n")}\n`;
  } finally {
    await server.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const collected = collectEntries();
  writeFileSync(join(root, "public/sitemap.xml"), sitemapXml(collected.entries));
  writeFileSync(join(root, "public/llms-full.txt"), await llmsFull(collected));
  console.log(`wrote sitemap (${collected.entries.length} urls) and llms-full.txt`);
}
