#!/usr/bin/env node
/**
 * Build-time per-route meta-tag generation.
 *
 * The Vite output is a single-page app — every route serves the same
 * index.html with the same <head>, and react-helmet-async swaps meta
 * tags client-side. That's fine for users (the page renders correctly)
 * but bad for SEO/AEO: Google's first-pass parser, social-card scrapers,
 * and AI crawlers all read the static HTML head before any JS runs. They
 * see the homepage's canonical/og:url on every route.
 *
 * This script runs as a postbuild step. For each known route, it copies
 * dist/index.html to dist/<route>/index.html with the <head> replaced to
 * match that route's title, description, canonical, og tags, and JSON-LD.
 * Vercel serves static files before falling back to the SPA rewrite, so
 * /blog/foo loads dist/blog/foo/index.html (correct meta) and then React
 * hydrates the body — best of both worlds.
 *
 * This is NOT full prerendering — the article body still renders via JS.
 * For now that's the right scope: meta tags are the leverage point for
 * first-pass SEO/AEO, and a custom Puppeteer-based prerender adds heavy
 * deps + Vercel build complexity. We can graduate to full SSG later if
 * needed.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ORIGIN = "https://buildwithporter.com";

// === Minimal frontmatter parser (same shape as src/blog/posts.ts).
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    else if (/^\[.*\]$/.test(value)) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    data[kv[1]] = value;
  }
  return { data, content: m[2] };
}

// === Build the list of routes to prerender. Static routes are hard-coded;
//     blog routes are auto-discovered from src/blog/posts/.
async function buildRoutes() {
  const routes = [
    {
      path: "/",
      title: "Porter: AI bookkeeper, accountant, and finance team for startups and SMBs",
      description:
        "Porter is the AI-native bookkeeper, accountant, and finance team for startups and small businesses. A modern AI accounting software plus a managed service — bookkeeping, AR, AP, payroll, tax — at a fraction of the cost of hiring an in-house team.",
    },
    {
      path: "/blog",
      title: "The CFO Playbook · Porter",
      description:
        "Plain-language writing on bookkeeping, accounting, AR, AP, and the parts of small-business finance nobody else explains honestly. The CFO playbook, from Porter.",
    },
    {
      path: "/careers",
      title: "Careers · Porter",
      description:
        "We're building AI finance teams for startups and SMBs. If that sounds like something you want to work on, we'd love to hear from you.",
    },
    {
      path: "/slack",
      title: "Porter for Slack · Porter",
      description:
        "Ask Porter anything in Slack. Cash position, past-due invoices, expense categorization. Same intelligence as the Porter app, in the channel you already live in.",
    },
    {
      path: "/support",
      title: "Support · Porter",
      description: "How to get help with Porter.",
    },
    {
      path: "/security",
      title: "Security · Porter",
      description:
        "How Porter protects your financial data. Encryption, access controls, sub-processors, and the approval-gated ledger that prevents unauthorized money movement.",
    },
    {
      path: "/privacy-policy",
      title: "Privacy Policy · Porter",
      description: "Porter's privacy policy.",
    },
    {
      path: "/terms-of-service",
      title: "Terms of Service · Porter",
      description: "Porter's terms of service.",
    },
    {
      path: "/legal/subprocessors",
      title: "Sub-processors · Porter",
      description: "Third-party sub-processors used by Porter.",
    },
  ];

  // Discover blog articles from src/blog/posts/*.md
  const postsDir = path.join(ROOT, "src/blog/posts");
  const files = (await fs.readdir(postsDir)).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const raw = await fs.readFile(path.join(postsDir, file), "utf-8");
    const { data: fm } = parseFrontmatter(raw);
    if (!fm.slug) continue;
    routes.push({
      path: `/blog/${fm.slug}`,
      title: `${fm.title} · Porter`,
      description: fm.description ?? "",
      heroImage: fm.heroImage,
      date: fm.date,
      isArticle: true,
    });
  }

  return routes;
}

// === Build the article JSON-LD (matches src/pages/BlogPost.tsx). Returns
//     the inner JSON string, not the <script> wrapper.
function buildArticleJsonLd(route) {
  const obj = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: route.title.replace(" · Porter", ""),
    description: route.description,
    datePublished: route.date,
    author: { "@type": "Organization", name: "Porter", url: ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "Porter",
      url: ORIGIN,
      logo: { "@type": "ImageObject", url: `${ORIGIN}/porter-logo-500.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${ORIGIN}${route.path}`,
    },
    ...(route.heroImage ? { image: `${ORIGIN}${route.heroImage}` } : {}),
  };
  return JSON.stringify(obj);
}

// === Replace the <head> contents for one route. Idempotent — re-runs
//     on the same output produce the same result.
function rewriteHead(baseHtml, route) {
  const fullUrl = `${ORIGIN}${route.path}`;
  const ogImage = route.heroImage ? `${ORIGIN}${route.heroImage}` : `${ORIGIN}/og-image.png`;

  // Replace <title>
  let html = baseHtml.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escape(route.title)}</title>`,
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escape(route.description)}" />`,
  );

  // Replace canonical link
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${fullUrl}" />`,
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escape(route.title)}" />`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escape(route.description)}" />`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${fullUrl}" />`,
  );
  html = html.replace(
    /<meta property="og:image" content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${ogImage}" />`,
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escape(route.title)}" />`,
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escape(route.description)}" />`,
  );
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${ogImage}" />`,
  );

  // For article routes, inject Article JSON-LD before </head>. Homepage
  // already has its own Organization + WebSite + SoftwareApplication JSON-LD
  // in index.html — we leave those in place and additionally inject the
  // Article schema only on article routes.
  if (route.isArticle) {
    const articleLd = `<script type="application/ld+json">${buildArticleJsonLd(route)}</script>`;
    html = html.replace("</head>", `    ${articleLd}\n  </head>`);
  }

  return html;
}

function escape(s) {
  return (s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function main() {
  console.log("[prerender-meta] starting");
  const baseHtmlPath = path.join(DIST, "index.html");
  const baseHtml = await fs.readFile(baseHtmlPath, "utf-8");

  const routes = await buildRoutes();
  console.log(`[prerender-meta] ${routes.length} routes`);

  let count = 0;
  for (const route of routes) {
    if (route.path === "/") {
      // Homepage: rewrite the root index.html in place.
      const rewritten = rewriteHead(baseHtml, route);
      await fs.writeFile(baseHtmlPath, rewritten);
      console.log(`[prerender-meta] /  → dist/index.html`);
      count++;
      continue;
    }

    // Other routes: create dist/<route>/index.html
    const outDir = path.join(DIST, route.path.replace(/^\//, ""));
    await fs.mkdir(outDir, { recursive: true });
    const rewritten = rewriteHead(baseHtml, route);
    await fs.writeFile(path.join(outDir, "index.html"), rewritten);
    console.log(`[prerender-meta] ${route.path}  → ${path.relative(ROOT, path.join(outDir, "index.html"))}`);
    count++;
  }

  console.log(`[prerender-meta] done — ${count} HTML files`);
}

main().catch((err) => {
  console.error("[prerender-meta] FAILED:", err);
  process.exit(1);
});
