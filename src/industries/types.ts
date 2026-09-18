// Reason (POR-3087): an industry page is the homepage template with its copy
// swapped. Every section keeps its homepage content as the default, so this
// type only carries what an industry replaces. Adding a field here means the
// section behind it must accept it as an optional prop; do not fork a section.

export type PainIllustration = "books" | "bookkeeper" | "invoices" | "tools";

export type IndustryContent = {
  /** Registry key; also the analytics `industry` property. */
  key: string;
  /** Canonical path on the apex domain, e.g. "/design". */
  path: string;
  /**
   * Production subdomain that serves this page at its root. Kept in sync with
   * vercel.json by src/industries/industries.test.ts.
   */
  host: string;
  /** Sub-brand shown in the hero eyebrow, e.g. "Porter Design". */
  brand: string;
  /**
   * Must be one of the audit's business-type tile labels
   * (src/pages/financialHealthAuditFlow.ts). The CTA pre-selects it.
   */
  auditBusinessType: string;
  seo: { title: string; description: string };
  hero: { title: string; sub: string };
  pain: {
    title: string;
    cards: { quote: string; body: string; illustration: PainIllustration }[];
  };
  does: { title: string; items: { title: string; body: string }[] };
  proof: { kind: string; icon: string; body: string };
  faq: { q: string; a: string }[];
  finalCta: { eyebrow: string; title: string; body: string };
};
