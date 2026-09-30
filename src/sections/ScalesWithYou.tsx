import { useRef, useState, useSyncExternalStore } from "react";
import { MaterialIcon } from "../components/MaterialIcon";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { Pill } from "../primitives/Pill";
import { HairlineCard } from "../primitives/HairlineCard";
import { CASES, type Case } from "../content/proof";
export type { Case } from "../content/proof";
import { useInView } from "../hooks/useInView";
import "./ScalesWithYou.css";

// Bar heights describe Porter's "scales with you" arc — slow start, accelerating climb,
// then a confident plateau at the top. Bars "click into place" left-to-right when the
// section enters view, evoking revenue growing month over month.
const BARS = [12, 16, 22, 28, 36, 48, 60, 74, 88, 98, 110, 120];

// Reason (POR-3087): an industry page shows the one case from its own industry.
// A marquee of one card duplicated reads as a glitch, so a single case renders
// as a static card instead. With no `cases`, the homepage marquee is unchanged.
export function ScalesWithYou({ cases }: { cases?: Case[] } = {}) {
  return (
    <section className="sws" id="why">
      <ManifestoPage />
      <ProofPage cases={cases} />
    </section>
  );
}

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ManifestoPage() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);

  // Reveal-on-enter: when the section scrolls into view, bars rise one by one.
  // prefers-reduced-motion: bars sit at full height instantly.
  const animate = inView || reduced;

  return (
    <div className="sws__page sws__page--manifesto" ref={ref}>
      {/* Growth background — a column chart that rises into place. */}
      <div className="sws__bg" aria-hidden="true">
        <div className="sws__bars">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`sws__bar ${animate ? "is-up" : ""}`}
              style={{
                height: `${h}%`,
                transitionDelay: reduced ? "0ms" : `${120 + i * 90}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container sws__content">
        <Reveal>
          <MicroLabel>Porter scales with you</MicroLabel>
        </Reveal>
        {/* Title is vertically centered in the manifesto page, so by the time
            a visitor clicks "Why Porter" in the nav and lands on this section,
            the scroll-scrub would only have animated halfway. Skip the scrub
            here — the rising bars behind the title already supply the
            section's motion. */}
        <SectionTitle
          text="From your first transaction to an entire finance department."
          className="sws__title"
          scrub={false}
        />
        <Reveal delay={160}>
          <p className="sws__body">
            When you're small, Porter keeps your books simple and clean, and your cash flowing. As you grow, your team grows with you to cover collections, vendor management, payroll, schedules, controls, and planning, all without you ever hiring, onboarding, or managing a finance department. You scale the function in a click, not a hiring cycle.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

function ProofPage({ cases }: { cases?: Case[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const deck = cases ?? CASES;
  const move = (direction: number) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * ((el.children[0] as HTMLElement).offsetWidth + 24), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className="sws__page sws__page--proof">
    <div className="container sws__proof-head">
      <div><MicroLabel>The proof</MicroLabel><SectionTitle as="h3" text="What we do for companies like yours." className="sws__proof-title" scrub={false} /></div>
      {!cases && <div className="sws__navigation"><span aria-live="polite">{String(active + 1).padStart(2,"0")} <span>/ {deck.length}</span></span>
        <Pill variant="secondary" aria-label="Previous customer story" disabled={active === 0} onClick={() => move(-1)}>←</Pill>
        <Pill variant="secondary" aria-label="Next customer story" disabled={atEnd} onClick={() => move(1)}>→</Pill>
      </div>}
    </div>
    <div className={`container ${cases ? "sws__static" : "sws__rail"}`} ref={rail}
      aria-label="Customer stories" tabIndex={cases ? undefined : 0}
      onKeyDown={event => { if (!cases && (event.key === "ArrowRight" || event.key === "ArrowLeft")) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
      onScroll={() => { if (rail.current && !cases) { const el=rail.current; const width=(el.children[0] as HTMLElement)?.offsetWidth + 24; setActive(Math.min(deck.length - 1, Math.round(el.scrollLeft / width))); setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4); } }}>
      {deck.map((c,i) => <CaseCard key={c.kind} c={c} index={i+1} />)}
    </div>
    {!cases && <div className="container sws__proof-foot"><span>Different businesses. One finance team.</span><span>Scroll to explore <span aria-hidden="true">→</span></span></div>}
  </div>;
}
function CaseCard({ c, index }: { c: Case; index: number }) {
  return <HairlineCard className="sws__card" role="article" aria-label={c.kind} tabIndex={0}>
    <div className="sws__card-head"><span className="sws__card-num">{String(index).padStart(2,"0")}</span><MaterialIcon name={c.icon} /></div>
    <div className="sws__card-body"><h4 className="sws__card-kind">{c.kind}</h4><p className="sws__card-text">{c.body}</p></div>
  </HairlineCard>;
}
