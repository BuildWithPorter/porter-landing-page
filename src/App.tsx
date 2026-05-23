import { Nav } from "./primitives/Nav";
import { Footer } from "./primitives/Footer";
import { WaitlistProvider } from "./components/WaitlistDialog";
// Experiment: HeroChart replaces the two-column Hero. To revert, swap this import.
// import { Hero } from "./sections/Hero";
import { HeroChart as Hero } from "./sections/HeroChart";
import { Pain } from "./sections/Pain";
import { WhatPorterDoes } from "./sections/WhatPorterDoes";
import { PorterIsSoftware } from "./sections/PorterIsSoftware";
import { ScalesWithYou } from "./sections/ScalesWithYou";
import { FinalCTA } from "./sections/FinalCTA";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";

export default function App() {
  // Trivial pathname routing — the SPA fallback in Vite/Vercel serves
  // index.html for any non-asset URL, so /privacy-policy and
  // /terms-of-service both render this app and we pick the right page.
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  if (path === "/privacy-policy" || path === "/privacy-policy.html") {
    return <PrivacyPolicy />;
  }
  if (path === "/terms-of-service" || path === "/terms-of-service.html") {
    return <TermsOfService />;
  }

  return (
    <WaitlistProvider>
      <Nav />
      <main>
        <Hero />
        <Pain />
        <WhatPorterDoes />
        <PorterIsSoftware />
        <ScalesWithYou />
        <div className="closing">
          <FinalCTA />
          <Footer />
        </div>
      </main>
    </WaitlistProvider>
  );
}
