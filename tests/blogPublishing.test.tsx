import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import markdownHandler from "../api/markdown";
import { getPostBySlug } from "../src/blog/posts";
import { BlogPost } from "../src/pages/BlogPost";

vi.mock("vite-react-ssg", () => ({
  Head: ({ children }: { children?: ReactNode }) => <div data-seo="">{children}</div>,
}));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function pngSize(path: string) {
  const buf = readFileSync(new URL(`../${path}`, import.meta.url));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const SLUGS = [
  "how-to-switch-bookkeepers",
  "what-does-ai-bookkeeping-actually-mean",
  "how-to-plan-inventory-when-your-books-cant-see-your-operations",
  "how-much-cash-should-your-business-hold",
  "get-paid-on-time",
];

describe("blog publishing", () => {
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");
  const indexNow = read("scripts/indexnow-submit.mjs");

  for (const slug of SLUGS) {
    const url = `https://buildwithporter.com/blog/${slug}`;

    it(`lists /blog/${slug} in the sitemap, llms.txt, and IndexNow`, () => {
      expect(sitemap).toContain(`<loc>${url}</loc>`);
      expect(llms).toContain(`](${url})`);
      expect(indexNow).toContain(`"/blog/${slug}"`);
    });

    it(`serves a markdown alternate for /blog/${slug}`, async () => {
      const response = markdownHandler(new Request(url, { headers: { Accept: "text/markdown" } }));
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/markdown");
      const body = await response.text();
      expect(body.startsWith("# ")).toBe(true);
      expect(body.length).toBeGreaterThan(200);
    });
  }

  it("serves the cash-reserve note production markdown was missing", async () => {
    const response = markdownHandler(
      new Request("https://buildwithporter.com/blog/how-much-cash-should-your-business-hold", {
        headers: { Accept: "text/markdown" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("# How much cash should your business actually hold?");
    expect(body).toContain("The five buckets a cash buffer covers");
  });

  it("returns markdown 404 for an unknown note", async () => {
    const response = markdownHandler(
      new Request("https://buildwithporter.com/blog/not-a-note", { headers: { Accept: "text/markdown" } }),
    );
    expect(response.status).toBe(404);
  });

  it("publishes the November 2 note with Michael's byline and share image", async () => {
    const post = getPostBySlug("get-paid-on-time");
    expect(post?.title).toBe("How to get paid on time without chasing your customers");
    expect(post?.date).toBe("2026-11-02");
    expect(post?.author).toBe("Michael Fajardo");
    expect(post?.description).toBe(
      "A simple weekly routine for owners who are tired of following up on late invoices, and how to keep the relationship intact when you do.",
    );
    expect(post?.rawBody).toContain("**Bill the day the work is done.**");
    expect(post?.rawBody).toContain("> Hi Sarah, hope the new space is coming together.");
    expect(post?.htmlBody).toContain("<blockquote>");
    expect(post?.htmlBody).toContain('id="where-the-money-gets-stuck"');

    const copy = `${post?.title}\n${post?.description}\n${post?.rawBody}`;
    expect(copy).not.toContain("—");
    for (const banned of [
      /\bAI\b/,
      /\bagents?\b/i,
      /\bautomat/i,
      /machine learning/i,
      /\bLLM\b/,
      /\bMCP\b/,
      /copilot/i,
      /\bdebits?\b/i,
      /\bcredits?\b/i,
      /\bGAAP\b/,
      /journal entr/i,
      /reconcil/i,
      /\bmargins?\b/i,
      /unit economics/i,
    ]) {
      expect(copy).not.toMatch(banned);
    }

    expect(pngSize("public/blog/get-paid-on-time-og.png")).toEqual({ width: 1200, height: 630 });
    expect(pngSize("public/blog/get-paid-on-time-hero.png").width).toBeGreaterThan(1000);
    expect(pngSize("public/blog/get-paid-on-time-thumb.png").width).toBeGreaterThan(600);

    const html = renderToString(
      <MemoryRouter initialEntries={["/blog/get-paid-on-time"]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toContain("Michael Fajardo");
    expect(html).toContain("November 2, 2026");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image" content="https://buildwithporter.com/blog/get-paid-on-time-og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://buildwithporter.com/blog/get-paid-on-time-og.png"');
    expect(html).toContain('rel="alternate" type="text/markdown"');
    expect(html).toContain("Where the money gets stuck");
    expect(html).toContain("Bill the day the work is done.");

    const markdown = await markdownHandler(
      new Request("https://buildwithporter.com/blog/get-paid-on-time", { headers: { Accept: "text/markdown" } }),
    ).text();
    expect(markdown).toContain("By Michael Fajardo, November 2, 2026.");
    expect(markdown).toContain("Most owners I talk to have the same story about late invoices.");
  });
});
