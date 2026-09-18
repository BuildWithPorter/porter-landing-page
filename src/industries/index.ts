import { design } from "./design";
import type { IndustryContent } from "./types";

export type { IndustryContent } from "./types";

// Reason (POR-3087): the single registry of industry pages. Routes, the sitemap
// test, the Meta pixel host allowlist, cross-subdomain attribution cookies and
// the vercel.json host rewrites all derive from (or are tested against) this
// list, so adding an industry is one entry here plus its content file.
export const INDUSTRIES: IndustryContent[] = [design];

// Reason: every industry page sends visitors to the same button text as the
// live audit intro, so the button is not a second variable in the campaign
// test (generic vs. industry creative). Change it here, not per industry.
export const INDUSTRY_CTA_LABEL = "Show me where I stand";

export function industryAuditHref(industry: IndustryContent): string {
  // Reason: relative on purpose. On the apex /design page it stays on the
  // apex; on design.buildwithporter.com, vercel.json 308-redirects
  // /financial-health-audit to the apex with the query intact. The audit must
  // run on the apex because its QuickBooks return URL is built from the
  // current origin and only the apex is registered for that round trip.
  const params = new URLSearchParams({ business_type: industry.auditBusinessType });
  return `/financial-health-audit?${params.toString()}`;
}

export function industryForHost(hostname: string): IndustryContent | null {
  const normalized = hostname.trim().toLowerCase();
  return INDUSTRIES.find((industry) => industry.host === normalized) ?? null;
}
