import type { ReactNode } from "react";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { MicroLabel } from "../primitives/MicroLabel";
import { Pill } from "../primitives/Pill";
import { Challenges } from "../sections/Challenges";
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
    <main className={`site-page ${path === "/why-porter" ? "site-page--why" : ""}`}>
      {children}<FinalCTA /><Footer />
    </main></WaitlistProvider>;
}
export function ProblemsPage() {
  return <SitePage path="/what-we-solve"><Challenges standalone /><div className="container site-page__next"><p>See the work your Porter team takes off your plate.</p><Pill href="/services" variant="secondary">Explore our services ↗</Pill></div></SitePage>;
}
export function ServicesPage() {
  return <SitePage path="/services"><WhatPorterDoes standalone /><div className="container site-page__next"><div><MicroLabel>The service and the software</MicroLabel><p>Our team handles the work. Our software keeps you in control.</p></div><Pill href="/use-cases" variant="secondary">See the software ↗</Pill></div></SitePage>;
}
export function WhyPorterPage() {
  return <SitePage path="/why-porter"><ScalesWithYou standalone /><Faq /></SitePage>;
}
