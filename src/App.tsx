import type { RouteRecord } from "vite-react-ssg";
import { Nav } from "./primitives/Nav";
import { Footer } from "./primitives/Footer";
import { WaitlistProvider } from "./components/WaitlistDialog";
import { Analytics } from "./components/Analytics";
import { Seo } from "./components/Seo";
import { HeroChart as Hero } from "./sections/HeroChart";
import { Pain } from "./sections/Pain";
import { WhatPorterDoes } from "./sections/WhatPorterDoes";
import { PorterIsSoftware } from "./sections/PorterIsSoftware";
import { ScalesWithYou } from "./sections/ScalesWithYou";
import { Faq } from "./sections/Faq";
import { FinalCTA } from "./sections/FinalCTA";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { SubProcessors } from "./pages/SubProcessors";
import { Security } from "./pages/Security";
import { SlackApp } from "./pages/SlackApp";
import { Support } from "./pages/Support";
import { SmsConsent } from "./pages/SmsConsent";
import { Careers } from "./pages/Careers";
import { Deck } from "./pages/Deck";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";
import { FinancialHealthAudit } from "./pages/FinancialHealthAudit";
import { getAllPosts } from "./blog/posts";

function HomePage() {
  return (
    <WaitlistProvider>
      <Seo
        title="Porter: AI bookkeeper, accountant, and finance team for startups and SMBs"
        description="Porter is the AI-native bookkeeper, accountant, and finance team for startups and small businesses. Bookkeeping, AR, AP, payroll, tax — done for you, with human leads overseeing every action. An entire finance team, at your fingertips."
        path="/"
      />
      <Nav />
      <main>
        <Hero />
        <Pain />
        <WhatPorterDoes />
        <PorterIsSoftware />
        <ScalesWithYou />
        <Faq />
        <div className="closing">
          <FinalCTA />
          <Footer />
        </div>
      </main>
    </WaitlistProvider>
  );
}

// Wrap every route with the shared <Analytics /> mount so it lives at the
// tree root regardless of which page is rendering.
function withAnalytics(children: React.ReactNode) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}

export const routes: RouteRecord[] = [
  { path: "/", element: withAnalytics(<HomePage />), entry: "src/App.tsx" },
  { path: "/blog", element: withAnalytics(<Blog />) },
  { path: "/financial-health-audit", element: withAnalytics(<FinancialHealthAudit />) },
  {
    path: "/blog/:slug",
    element: withAnalytics(<BlogPost />),
    // Enumerate the exact slugs to prerender. `getAllPosts()` reads from
    // Vite's build-time import.meta.glob, so this list stays in sync with
    // src/blog/posts/*.md automatically.
    getStaticPaths: () => getAllPosts().map((p) => `/blog/${p.slug}`),
  },
  { path: "/careers", element: withAnalytics(<Careers />) },
  { path: "/slack", element: withAnalytics(<SlackApp />) },
  { path: "/support", element: withAnalytics(<Support />) },
  // Reason: Twilio A2P review requires a public proof URL for Porter's login-gated SMS opt-in flow.
  { path: "/sms-consent", element: withAnalytics(<SmsConsent />) },
  { path: "/security", element: withAnalytics(<Security />) },
  { path: "/privacy-policy", element: withAnalytics(<PrivacyPolicy />) },
  { path: "/terms-of-service", element: withAnalytics(<TermsOfService />) },
  { path: "/legal/subprocessors", element: withAnalytics(<SubProcessors />) },
  // /deck is an internal demo gallery (noindex meta set in Deck.tsx). We
  // still ship a static HTML for it so the URL is stable when shared.
  { path: "/deck", element: withAnalytics(<Deck />) },
];

export default routes;
