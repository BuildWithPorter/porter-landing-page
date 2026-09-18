import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { INDUSTRIES, INDUSTRY_CTA_LABEL, industryAuditHref, industryForHost } from "../src/industries";
import { businessTypeFromQuery } from "../src/pages/financialHealthAuditFlow";
import { IndustryPage } from "../src/pages/IndustryPage";

vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

type VercelRoute = {
  src?: string;
  dest?: string;
  status?: number;
  has?: { type: string; value: string }[];
  headers?: Record<string, string>;
};

// Reason (POR-3087): an industry page is only live when four separate places
// agree: this registry, vercel.json (the subdomain serves the page and bounces
// the audit to the apex), the sitemap, and the audit's business-type tiles. JSON
// cannot carry comments, so this test is where that contract is written down.
describe("industry registry contract", () => {
  const routes: VercelRoute[] = JSON.parse(read("vercel.json")).routes;
  const sitemap = read("public/sitemap.xml");
  const hostRoutes = (host: string) =>
    routes.filter((route) => route.has?.some((h) => h.type === "host" && h.value === host));

  for (const industry of INDUSTRIES) {
    describe(industry.key, () => {
      it("serves the page at the subdomain root", () => {
        expect(hostRoutes(industry.host)).toContainEqual(
          expect.objectContaining({ src: "^/$", dest: `${industry.path}.html` }),
        );
      });

      it("sends the subdomain's audit link to the apex, where QuickBooks can return", () => {
        expect(hostRoutes(industry.host)).toContainEqual(
          expect.objectContaining({
            src: "^/financial-health-audit/?$",
            status: 308,
            headers: { Location: "https://buildwithporter.com/financial-health-audit" },
          }),
        );
      });

      it("routes host rewrites before the filesystem handler", () => {
        const filesystem = routes.findIndex((route) => "handle" in route);
        for (const route of hostRoutes(industry.host)) {
          expect(routes.indexOf(route)).toBeLessThan(filesystem);
        }
      });

      it("is listed in the sitemap at its apex path", () => {
        expect(sitemap).toContain(`<loc>https://buildwithporter.com${industry.path}</loc>`);
      });

      it("pre-selects a business type the audit accepts", () => {
        expect(businessTypeFromQuery(industry.auditBusinessType)).toBe(industry.auditBusinessType);
        expect(industryAuditHref(industry)).toBe(
          `/financial-health-audit?business_type=${encodeURIComponent(industry.auditBusinessType).replace(/%20/g, "+")}`,
        );
      });

      it("resolves from its host", () => {
        expect(industryForHost(industry.host)).toBe(industry);
        expect(industryForHost(industry.host.toUpperCase())).toBe(industry);
      });

      it("follows the site's copy rules (CLAUDE.md: no AI talk, no jargon, no em dashes)", () => {
        const copy = JSON.stringify(industry);
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
      });
    });
  }
});

describe("IndustryPage", () => {
  const industry = INDUSTRIES[0];
  const html = renderToString(<IndustryPage industry={industry} />);

  it("renders the industry hero with a CTA into the pre-selected audit", () => {
    expect(html).toContain(industry.brand);
    expect(html).toContain(industry.hero.title.replace(/'/g, "&#x27;"));
    const href = industryAuditHref(industry).replace(/&/g, "&amp;");
    // Hero and closing section both lead to the same audit link.
    expect(html.split(`href="${href}"`).length - 1).toBe(2);
    expect(html.split(INDUSTRY_CTA_LABEL).length - 1).toBe(2);
  });

  it("drops homepage copy that would contradict a single-industry page", () => {
    // Trust strip lists every segment; the services sub says "AI finance agents".
    expect(html).not.toContain("Trusted by");
    expect(html).not.toContain("AI finance agents");
    expect(html).not.toContain("Try Porter");
  });

  it("uses only icons the site has (an unknown name falls back to a question mark)", () => {
    expect(html).not.toContain("lucide-circle-help");
  });

  it("keeps the shared security answer in the FAQ", () => {
    expect(html).toContain("Is my financial data secure with Porter?");
  });
});
