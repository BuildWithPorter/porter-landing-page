import type { MouseEvent } from "react";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { HeroChart as Hero } from "../sections/HeroChart";
import { Pain } from "../sections/Pain";
import { WhatPorterDoes } from "../sections/WhatPorterDoes";
import { PorterIsSoftware } from "../sections/PorterIsSoftware";
import { ScalesWithYou } from "../sections/ScalesWithYou";
import { Faq } from "../sections/Faq";
import { securityFaq } from "../legal/securityContent";
import { FinalCTA } from "../sections/FinalCTA";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import { INDUSTRY_CTA_LABEL, industryAuditHref, industryForHost, type IndustryContent } from "../industries";

// Reason (POR-3087): one template for every industry page, in the homepage's
// section order, so the only difference a campaign arm tests is the copy.
// PorterIsSoftware stays generic on purpose: the site's copy rules require the
// software to be unmistakable, and its demo is not industry-specific.
export function IndustryPage({ industry }: { industry: IndustryContent }) {
  const href = industryAuditHref(industry);
  // Reason: the click event is what joins an industry page to the audit
  // funnel in PostHog. landing_path alone cannot, because first-touch
  // attribution keeps the visitor's earliest page, not this one.
  const ctaFor = (placement: "hero" | "closing") => ({
    label: INDUSTRY_CTA_LABEL,
    href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      trackMarketingEvent("industry_cta_clicked", { industry: industry.key, placement });
      // Reason: the audit must run on the apex (its QuickBooks return URL is
      // built from the current origin). From an industry subdomain, go straight
      // there with the query intact rather than relying on the vercel.json
      // redirect, which exists only as the no-JavaScript fallback.
      if (industryForHost(window.location.hostname)) {
        event.preventDefault();
        window.location.assign(`https://buildwithporter.com${href}`);
      }
    },
  });

  return (
    <WaitlistProvider>
      <Seo title={industry.seo.title} description={industry.seo.description} path={industry.path} />
      <Nav />
      <main>
        <Hero eyebrow={industry.brand} title={industry.hero.title} sub={industry.hero.sub} cta={ctaFor("hero")} />
        <Pain title={industry.pain.title} cards={industry.pain.cards} />
        <WhatPorterDoes title={industry.does.title} items={industry.does.items} />
        <PorterIsSoftware />
        <ScalesWithYou cases={[industry.proof]} />
        <Faq items={[...industry.faq, securityFaq]} />
        <div className="closing">
          <FinalCTA
            eyebrow={industry.finalCta.eyebrow}
            title={industry.finalCta.title}
            body={industry.finalCta.body}
            cta={ctaFor("closing")}
          />
          <Footer />
        </div>
      </main>
    </WaitlistProvider>
  );
}
