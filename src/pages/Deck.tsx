import { LiveDashboard } from "../mockups/LiveDashboard";
import { CustomDashboard } from "../mockups/CustomDashboard";
import { SoftwareDemoChart } from "../mockups/SoftwareDemoChart";
import { SoftwareDemoProactive } from "../mockups/SoftwareDemoProactive";
import { SoftwareDemoSlack } from "../mockups/SoftwareDemoSlack";
import { PorterAIApp } from "../mockups/PorterAIApp";
import { Seo } from "../components/Seo";
import "./Deck.css";

/* Hidden /deck route used to capture clean 16:9 screenshots of every
   product mockup for the customer pitch deck. Each section is a fixed
   1440 × 810 frame so screenshots are pixel-exact. */

const FRAMES: { id: string; title: string; el: React.ReactNode }[] = [
  { id: "live-dashboard",   title: "Live finance dashboard",        el: <LiveDashboard /> },
  { id: "custom-dashboard", title: "Custom dashboard",              el: <CustomDashboard /> },
  { id: "porter-ai-app",    title: "Porter AI app",                 el: <PorterAIApp /> },
  { id: "demo-chart",       title: "Ask anything — chart Q&A",      el: <SoftwareDemoChart /> },
  { id: "demo-proactive",   title: "Proactive — AR + invoices",     el: <SoftwareDemoProactive /> },
  { id: "demo-slack",       title: "Slack — AP and cash Q&A",       el: <SoftwareDemoSlack /> },
];

export function Deck() {
  return (
    <div className="deck">
      {/* Internal-only screenshot gallery — keep out of search results. */}
      <Seo
        title="Deck · Porter (internal)"
        description="Internal screenshot gallery for the customer pitch deck."
        path="/deck"
        robots="noindex, nofollow"
      />
      {FRAMES.map((f) => (
        <section key={f.id} id={f.id} className="deck__section">
          <div className="deck__frame">{f.el}</div>
          <div className="deck__label">{f.title}</div>
        </section>
      ))}
    </div>
  );
}
