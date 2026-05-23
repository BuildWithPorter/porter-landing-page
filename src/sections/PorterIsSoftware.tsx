import { useState } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { SoftwareDemoChart } from "../mockups/SoftwareDemoChart";
import { SoftwareDemoProactive } from "../mockups/SoftwareDemoProactive";
import { SoftwareDemoSlack } from "../mockups/SoftwareDemoSlack";
import "./PorterIsSoftware.css";

type TabKey = "software" | "proactive" | "adapts";

const TABS: { key: TabKey; badge: string; title: string; sub: string }[] = [
  {
    key: "software",
    badge: "01",
    title: "The Porter app",
    sub: "A modern replacement for QuickBooks, built for operators instead of accountants. Your books, your numbers, your whole finance function in one place.",
  },
  {
    key: "proactive",
    badge: "02",
    title: "Proactive assistant",
    sub: "Porter doesn't wait for you. It flags what changed, reminds you what's due, and guides you through the calls that need you.",
  },
  {
    key: "adapts",
    badge: "03",
    title: "Adapts to the way you work",
    sub: "Access the same intelligence via our Claude MCP, Slack app, and email bot — wherever your team already lives.",
  },
];

export function PorterIsSoftware() {
  const [active, setActive] = useState<TabKey>("software");

  return (
    <section className="pis section" id="software">
      <SectionGradient shape={SHAPES.plateau} />
      <div className="container pis__inner">
        <Reveal>
          <MicroLabel>The software</MicroLabel>
        </Reveal>
        <SectionTitle text="More than a service. It's where your finances live." className="pis__title" />
        <Reveal delay={140}>
          <p className="pis__sub">
            Porter is your daily interface for all things finance-related, no matter where you are. You can access Porter's knowledge via the app, Claude, Slack, or email.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="pis__tiles" role="tablist" aria-label="Porter capabilities">
            {TABS.map((t) => {
              const isActive = active === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`pis__tile ${isActive ? "is-active" : ""}`}
                  onClick={() => setActive(t.key)}
                >
                  <span className="pis__tile-badge">{t.badge}</span>
                  <span className="pis__tile-title">{t.title}</span>
                  <span className="pis__tile-body">{t.sub}</span>
                  <span className="pis__tile-arrow" aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="pis__stage" key={active}>
            {active === "software" && <SoftwareDemoChart />}
            {active === "proactive" && <SoftwareDemoProactive />}
            {active === "adapts" && <SoftwareDemoSlack />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

