import type { ReactNode } from "react";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Pill } from "../primitives/Pill";
import { Pain } from "../sections/Pain";
import { WhatPorterDoes } from "../sections/WhatPorterDoes";
import { ScalesWithYou } from "../sections/ScalesWithYou";
import { Faq } from "../sections/Faq";
import { FinalCTA } from "../sections/FinalCTA";
import { SITE_PAGES, SERVICES } from "../content/sitePages";
import "./SitePages.css";

function SitePage({ path, children }: { path: keyof typeof SITE_PAGES; children: ReactNode }) {
  const page = SITE_PAGES[path];
  const url = `https://buildwithporter.com${path}`;
  const jsonLd: object[] = [{ "@context": "https://schema.org", "@type": "WebPage", name: page.label, description: page.description, url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Porter", item: "https://buildwithporter.com/" }, { "@type": "ListItem", position: 2, name: page.label, item: url }] }];
  if (path === "/services") jsonLd.push({ "@context": "https://schema.org", "@type": "Service", name: "Porter managed finance services", description: page.description, url, provider: { "@id": "https://buildwithporter.com/#organization" }, hasOfferCatalog: { "@type": "OfferCatalog", name: "Finance services", itemListElement: SERVICES.map(service => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: service.title, description: service.body } })) } });
  return <WaitlistProvider><Seo title={`${page.label} | Porter`} description={page.description} path={path} jsonLd={jsonLd} /><Nav />
    <main className={`site-page ${path === "/why-porter" ? "site-page--why" : ""}`}>{path !== "/why-porter" && <header className="container site-page__intro"><MicroLabel>{page.label}</MicroLabel><SectionTitle as="h1" text={page.title} scrub={false} /><p>{page.description}</p></header>}
      {children}<FinalCTA /><Footer />
    </main></WaitlistProvider>;
}
export function ProblemsPage() {
  return <SitePage path="/what-we-solve"><Pain cinematic /><div className="container site-page__next"><p>See the work your Porter team takes off your plate.</p><Pill href="/services" variant="secondary">Explore our services ↗</Pill></div></SitePage>;
}
export function ServicesPage() {
  return <SitePage path="/services"><WhatPorterDoes title="Six services. One accountable team." /><div className="container site-page__next"><div><MicroLabel>The service and the software</MicroLabel><p>Your team handles the work. The Porter app keeps the records, answers and decisions within reach.</p></div><Pill href="/use-cases" variant="secondary">See the software ↗</Pill></div></SitePage>;
}
export function WhyPorterPage() {
  return <SitePage path="/why-porter"><ScalesWithYou standalone /><Faq /></SitePage>;
}
