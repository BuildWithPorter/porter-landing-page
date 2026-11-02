export const ORGANIZATION_ID = "https://buildwithporter.com/#organization";

type FaqItem = { q: string; a: string };

// Reason: index.html publishes the organization node. New FAQ pages point at
// that @id. Pages that omit providerId keep the existing FAQPage shape.
export function faqPageJsonLd(items: readonly FaqItem[], providerId?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    ...(providerId ? { provider: { "@id": providerId } } : {}),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
