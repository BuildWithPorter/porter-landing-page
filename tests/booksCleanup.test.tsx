// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://books-cleanup.buildwithporter.com/"}
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../src/App";
import { isBooksCleanupHost } from "../src/industries";

vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

// Reason: jsdom replaces import.meta.url resolution, so read from the repo root.
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Books Cleanup campaign", () => {
  it("resolves only the exact production host", () => {
    expect(isBooksCleanupHost("books-cleanup.buildwithporter.com")).toBe(true);
    expect(isBooksCleanupHost("BOOKS-CLEANUP.BUILDWITHPORTER.COM")).toBe(true);
    expect(isBooksCleanupHost("preview.books-cleanup.buildwithporter.com")).toBe(false);
    expect(isBooksCleanupHost("sale-ready.buildwithporter.com")).toBe(false);
  });

  it("rewrites the host root to /books-cleanup and lists the page in the sitemap", () => {
    expect(JSON.parse(read("vercel.json")).routes).toContainEqual(expect.objectContaining({
      src: "^/$", dest: "/books-cleanup", has: [{ type: "host", value: "books-cleanup.buildwithporter.com" }],
    }));
    expect(read("public/sitemap.xml")).toContain("<loc>https://buildwithporter.com/books-cleanup</loc>");
  });

  // Reason: vercel.json rewrites "/" but the client router only sees "/", so the
  // root route must pick this page by hostname (see tests/industryHostRoot).
  it("renders the campaign page, not the homepage, at the host root", () => {
    const root = routes.find((route) => route.path === "/");
    const html = renderToString(<>{root?.element}</>);
    expect(html).toContain("Behind on your books? We catch them up in less than 2 weeks.");
    expect(html).not.toContain("Trusted by");
  });

  it("follows the site copy rules in the page, checklist and email", () => {
    const sources = ["src/pages/BooksCleanup.tsx", "src/content/booksCleanupChecklist.ts", "api/books-cleanup.ts"].map((path) => read(path)).join("\n");
    const html = renderToString(<>{routes.find((route) => route.path === "/books-cleanup")?.element}</>);
    for (const text of [sources, html]) {
      expect(text).not.toMatch(/—/);
      expect(text.replace(/<[^>]+>/g, " ")).not.toMatch(/\b(AI|automation|automated|agents?)\b/);
      expect(text).not.toMatch(/\$\d/);
    }
  });
});
