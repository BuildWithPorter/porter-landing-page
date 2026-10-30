// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKS_CLEANUP_FAQS, BOOKS_CLEANUP_SERVICE_DESCRIPTION } from "../src/content/booksCleanupFaq";
import { BlogPost } from "../src/pages/BlogPost";
import { BooksCleanupPage } from "../src/pages/BooksCleanup";
import { MultiEntityPage } from "../src/pages/MultiEntity";
import { SaleReadyPage } from "../src/pages/SaleReady";
import { HeroChart } from "../src/sections/HeroChart";
import { TOPIC_PAGES, MULTI_ENTITY_PAGE } from "../src/content/topicPages";
import { markdownDocument } from "../api/markdown";
import { collectEntries } from "../scripts/generate-public-seo.mjs";

vi.mock("vite-react-ssg", () => ({ Head: ({ children }: { children?: React.ReactNode }) => <>{children}</> }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const ORGANIZATION_ID = "https://buildwithporter.com/#organization";

const SCHEMA_TYPES = new Set([
  "Answer", "Article", "BreadcrumbList", "ContactPoint", "FAQPage", "ImageObject", "ListItem",
  "Offer", "OfferCatalog", "Organization", "PostalAddress", "Question", "Service",
  "SoftwareApplication", "VideoObject", "WebApplication", "WebPage", "WebSite",
]);

const REQUIRED: Record<string, string[]> = {
  Organization: ["name", "url"],
  WebSite: ["name", "url", "publisher"],
  Service: ["name", "serviceType", "url", "description", "provider"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  Answer: ["text"],
  Article: ["headline", "publisher"],
  Offer: ["itemOffered"],
  OfferCatalog: ["itemListElement"],
};

function shapeErrors(node: unknown, path = "$"): string[] {
  if (Array.isArray(node)) return node.flatMap((item, index) => shapeErrors(item, `${path}[${index}]`));
  if (!node || typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  const errors: string[] = [];
  const type = record["@type"];
  if (typeof type === "string") {
    if (!SCHEMA_TYPES.has(type)) errors.push(`${path} has unknown schema.org type ${type}`);
    if (record["@context"] !== undefined && record["@context"] !== "https://schema.org") {
      errors.push(`${path} @context must be https://schema.org`);
    }
    for (const key of REQUIRED[type] ?? []) {
      if (record[key] === undefined || record[key] === "") errors.push(`${path} ${type} missing ${key}`);
    }
  } else if (typeof record["@id"] !== "string") {
    errors.push(`${path} needs @type or @id`);
  }
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === "object") errors.push(...shapeErrors(value, `${path}.${key}`));
  }
  return errors;
}

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => {
    const raw = match[1]
      .replace(/&quot;/g, "\"")
      .replace(/&amp;/g, "&")
      .replace(/&#x27;/g, "'")
      .replace(/\\u003c/g, "<");
    return JSON.parse(raw) as Record<string, unknown>;
  });
}

function visibleText(html: string, tag: string) {
  const inner = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "";
  return inner.replace(/<br\s*\/?>/gi, "").replace(/<[^>]+>/g, "");
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

describe("site-wide organization identity", () => {
  const nodes = jsonLd(read("index.html"));
  const organization = nodes.find((node) => node["@type"] === "Organization");
  const website = nodes.find((node) => node["@type"] === "WebSite");

  it("publishes one Organization @id and a WebSite that points at it", () => {
    expect(organization).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Porter",
      url: "https://buildwithporter.com/",
      logo: "https://buildwithporter.com/porter-logo-500.png",
      email: "support@buildwithporter.com",
      description: "Porter gives startups and small businesses a finance team and modern accounting software. The team handles bookkeeping and accounting, accounts receivable, accounts payable, payroll, taxes, and financial planning and analysis.",
      sameAs: [
        "https://www.linkedin.com/company/buildwithporter",
        "https://www.capterra.com/p/10048904/Porter/",
      ],
    });
    expect(website).toMatchObject({
      "@type": "WebSite",
      "@id": "https://buildwithporter.com/#website",
      url: "https://buildwithporter.com/",
      name: "Porter",
      publisher: { "@id": ORGANIZATION_ID },
    });
    expect(read("index.html")).toContain("TODO: Add X and any other official profiles to sameAs once Michael confirms the URLs.");
    for (const node of nodes) expect(shapeErrors(node)).toEqual([]);
  });
});

describe("offer page structured data", () => {
  it("matches the books cleanup FAQ to the visible copy and omits areaServed", () => {
    const html = renderToString(<BooksCleanupPage />);
    const nodes = jsonLd(html);
    const service = nodes.find((node) => node["@type"] === "Service");
    const faq = nodes.find((node) => node["@type"] === "FAQPage");
    expect(service).toMatchObject({
      name: "Books cleanup",
      serviceType: "Catch-up bookkeeping",
      url: "https://buildwithporter.com/books-cleanup",
      provider: { "@id": ORGANIZATION_ID },
      description: BOOKS_CLEANUP_SERVICE_DESCRIPTION,
    });
    expect(service).not.toHaveProperty("areaServed");
    expect(faq?.mainEntity).toEqual(BOOKS_CLEANUP_FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })));
    for (const item of BOOKS_CLEANUP_FAQS) {
      expect(html).toContain(item.q);
      expect(html).toContain(item.a);
    }
    for (const node of nodes) expect(shapeErrors(node)).toEqual([]);
  });

  it("adds sale-ready Service JSON-LD without a new FAQ or areaServed", () => {
    const html = renderToString(<SaleReadyPage />);
    const nodes = jsonLd(html);
    const service = nodes.find((node) => node["@type"] === "Service");
    expect(service).toMatchObject({
      name: "Sale-ready books",
      serviceType: "Sale-ready bookkeeping",
      url: "https://buildwithporter.com/sale-ready",
      provider: { "@id": ORGANIZATION_ID },
    });
    expect(service).not.toHaveProperty("areaServed");
    expect(nodes.some((node) => node["@type"] === "FAQPage")).toBe(false);
    expect(html).not.toContain("Common questions");
    for (const node of nodes) expect(shapeErrors(node)).toEqual([]);
  });
});

describe("headings and article publisher", () => {
  it("keeps a space where an H1 breaks across lines", () => {
    expect(visibleText(renderToString(<HeroChart />), "h1")).toContain("team, at your fingertips.");
    const multi = renderToString(<MemoryRouter><MultiEntityPage /></MemoryRouter>);
    // Reason: PR138 replaced the old line-broken heading with the approved topic heading.
    expect(visibleText(multi, "h1")).toBe(MULTI_ENTITY_PAGE.h1);
    expect(visibleText(renderToString(<SaleReadyPage />), "h1")).toContain("Books that hold up when a buyer looks.");
  });

  it("points blog publishers at the organization @id", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/blog/how-to-switch-bookkeepers"]}>
        <Routes><Route path="/blog/:slug" element={<BlogPost />} /></Routes>
      </MemoryRouter>,
    );
    const article = jsonLd(html).find((node) => node["@type"] === "Article");
    expect(article?.publisher).toEqual({ "@id": ORGANIZATION_ID });
    expect(shapeErrors(article)).toEqual([]);
  });
});

describe("sitemap coverage", () => {
  it("includes indexable routes and the posts that were missing, and drops /docs and /deck", () => {
    const paths = new Set(collectEntries().entries.map((entry) => entry.path));
    const routed = [...read("src/App.tsx").matchAll(/path: "([^"]+)"/g)].map((match) => match[1]);
    for (const path of routed) {
      if (path.includes(":") || path === "/deck") continue;
      expect(paths.has(path)).toBe(true);
    }
    // Reason: dynamic topic routes are absent from literal App.tsx path matches.
    for (const page of TOPIC_PAGES) {
      expect(paths.has(page.path)).toBe(true);
      expect(markdownDocument(page.path)).toContain(page.lede);
    }
    expect(paths.size).toBe(collectEntries().entries.length);
    expect(paths.has("/docs")).toBe(false);
    expect(paths.has("/deck")).toBe(false);
    expect(paths.has("/design")).toBe(true);
    expect(paths.has("/blog/how-much-cash-should-your-business-hold")).toBe(true);
    expect(paths.has("/blog/how-to-plan-inventory-when-your-books-cant-see-your-operations")).toBe(true);
  });
});
