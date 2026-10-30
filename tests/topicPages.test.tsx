import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import handler from "../api/markdown";
import { routes } from "../src/App";
import { ORGANIZATION_ID, faqPageJsonLd } from "../src/content/faqPageJsonLd";
import { TOPIC_PAGES } from "../src/content/topicPages";
import { TopicPageView } from "../src/pages/TopicPage";

vi.mock("vite-react-ssg", () => ({
  Head: ({ children }: { children?: unknown }) => children ?? null,
}));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function visible(html: string) {
  return html.replaceAll("&#x27;", "'");
}

function renderPage(path: string) {
  const page = TOPIC_PAGES.find((item) => item.path === path);
  if (!page) throw new Error(path);
  return visible(renderToString(<MemoryRouter><TopicPageView page={page} /></MemoryRouter>));
}

describe("topic pages", () => {
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");

  for (const page of TOPIC_PAGES) {
    it(`publishes ${page.path} with matching FAQ schema`, () => {
      expect(routes.some((route) => route.path === page.path)).toBe(true);
      expect(sitemap).toContain(`<loc>https://buildwithporter.com${page.path}</loc>`);
      expect(llms).toContain(`https://buildwithporter.com${page.path}`);
      const html = renderPage(page.path);
      expect(html).toContain(`>${page.h1}<`);
      expect(html).toContain(page.title);
      expect(html).toContain(page.description);
      expect(html).toContain(page.lede);
      expect(html).toContain(">Talk to Porter<");
      expect(html).toContain('role="img"');
      expect(html).toContain("Illustrative example");
      expect(html).not.toContain("[VERIFY]");
      expect(html).not.toContain("—");
      expect(html).not.toContain("Bench");
      expect(html).not.toContain("Pilot");
      expect(html).not.toMatch(/\$\d/);
      for (const faq of page.faqs) {
        expect(html).toContain(faq.q);
        expect(html).toContain(faq.a);
        if (faq.more) expect(html).toContain(`href="${faq.more.href}"`);
      }
      for (const link of page.related) expect(html).toContain(`href="${link.href}"`);
      const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      expect(script?.[1]).toBeTruthy();
      expect(JSON.parse(script?.[1] ?? "")).toEqual(faqPageJsonLd(page.faqs, ORGANIZATION_ID));
    });
  }

  it("omits unverified claims and the competitor price graphic", () => {
    const faq = renderPage("/faq");
    const search = renderPage("/search-funds");
    const family = renderPage("/family-offices");
    const restaurants = renderPage("/restaurants");
    const multi = renderPage("/multi-entity");
    expect(faq).not.toContain("Does Porter prepare tax returns?");
    expect(faq).not.toContain("Is Porter a fractional CFO?");
    expect(search).toContain("Is Porter a fractional CFO?");
    expect(search).not.toContain("Does Porter prepare lender and covenant reporting?");
    expect(search).not.toContain("lender packages");
    expect(family).not.toContain("What Porter does not do");
    expect(family).not.toContain("Does Porter replace our outside CPA?");
    expect(family).not.toContain("Can Porter consolidate companies in different industries?");
    expect(restaurants).not.toContain("Point of sale");
    expect(restaurants).not.toContain("Toast");
    expect(multi).not.toContain("It can also split shared bills across companies.");
    expect(multi).not.toContain("your finance stack");
    expect(multi).not.toContain("Get a tailored recommendation");
    expect(multi).toContain("Split shared bills");
    expect(multi).toContain('href="/faq"');
  });

  it("serves the pages as markdown without verification notes", async () => {
    for (const page of TOPIC_PAGES) {
      const response = handler(new Request(`https://buildwithporter.com${page.path}`, {
        headers: { accept: "text/markdown" },
      }));
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body.startsWith(`# ${page.h1}`)).toBe(true);
      expect(body).toContain(page.faqs[0]?.q ?? "");
      expect(body).not.toContain("[VERIFY]");
      expect(body).not.toContain("—");
    }
  });
});
