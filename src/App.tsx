import { Nav } from "./primitives/Nav";
import { Footer } from "./primitives/Footer";
import { WaitlistProvider } from "./components/WaitlistDialog";
import { Analytics } from "./components/Analytics";
import { Seo } from "./components/Seo";
// Experiment: HeroChart replaces the two-column Hero. To revert, swap this import.
// import { Hero } from "./sections/Hero";
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
import { Careers } from "./pages/Careers";
import { Deck } from "./pages/Deck";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";

// Trivial pathname routing — the SPA fallback in Vite/Vercel serves
// index.html for any non-asset URL, so /privacy-policy and
// /terms-of-service both render this app and we pick the right page.
function renderPage(path: string) {
  if (path === "/privacy-policy" || path === "/privacy-policy.html") {
    return <PrivacyPolicy />;
  }
  if (path === "/terms-of-service" || path === "/terms-of-service.html") {
    return <TermsOfService />;
  }
  if (path === "/legal/subprocessors" || path === "/legal/subprocessors.html") {
    return <SubProcessors />;
  }
  if (path === "/security" || path === "/security.html") {
    return <Security />;
  }
  if (path === "/slack" || path === "/slack.html") {
    return <SlackApp />;
  }
  if (path === "/support" || path === "/support.html") {
    return <Support />;
  }
  if (path === "/careers" || path === "/careers.html") {
    return <Careers />;
  }
  if (path === "/deck" || path === "/deck.html") {
    return <Deck />;
  }
  if (path === "/blog" || path === "/blog/" || path === "/blog.html") {
    return <Blog />;
  }
  // /blog/<slug> — single article route.
  const blogMatch = path.match(/^\/blog\/([^/]+?)(?:\.html)?\/?$/);
  if (blogMatch) {
    return <BlogPost slug={blogMatch[1]} />;
  }

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

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return (
    <>
      {renderPage(path)}
      {/* Mounted once at root. Each analytics tool self-noops when its env key is absent. */}
      <Analytics />
    </>
  );
}
