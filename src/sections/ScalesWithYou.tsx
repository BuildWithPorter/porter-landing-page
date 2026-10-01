import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { Pill } from "../primitives/Pill";
import { CASES, type Case } from "../content/proof";
export type { Case } from "../content/proof";
import { useInView } from "../hooks/useInView";
import "./ScalesWithYou.css";

// Bar heights describe Porter's "scales with you" arc — slow start, accelerating climb,
// then a confident plateau at the top. Bars "click into place" left-to-right when the
// section enters view, evoking revenue growing month over month.
const BARS = [12, 16, 22, 28, 36, 48, 60, 74, 88, 98, 110, 120];

// Industry pages can supply their own case without an automatic story rotation.
export function ScalesWithYou({ cases, standalone = false }: { cases?: Case[]; standalone?: boolean } = {}) {
  return (
    <section className="sws" id="why">
      <ManifestoPage standalone={standalone} />
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

function ManifestoPage({ standalone }: { standalone: boolean }) {
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
          as={standalone ? "h1" : "h2"}
          text="A finance team that grows with you."
          className="sws__title"
          scrub={false}
        />
        <Reveal delay={160}>
          <p className="sws__body">
            Start with the books. Add collections, payroll, controls and planning as you grow. Porter handles the work, without the hiring cycle.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

const SUMMARIES = [
  "Separate company books. One consolidated view, with intercompany activity removed.",
  "Completed work becomes invoices. Payments are matched. The books stay current.",
  "Payroll, commissions and payments across two countries, handled by one finance team.",
  "Receipts collected. Sales recorded. A weekly view of profit and food costs.",
  "Annual contracts become monthly revenue, with the full finance function behind them.",
  "Client deposits stay separate from studio fees. Every vendor bill connects to its project.",
  "Interest tracked by draw. Revenue scheduled by contract. Payments matched to invoices.",
  "Past months caught up. Revenue separated by channel, so every line of business is clear.",
  "Current books and a reliable monthly close. Investor reports ready when you need them.",
  "Sessions, payouts and bank records brought together. Books current from the first month.",
];

function ProofPage({ cases }: { cases?: Case[] }) {
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reading, setReading] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const viewRef = useRef<HTMLDivElement>(null);
  const deck = cases ?? CASES;
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (viewRef.current) observer.observe(viewRef.current);
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  const automatic = !cases && !reduced && !paused && !hovering && !focused && !reading && inView && visible;
  useEffect(() => {
    if (!automatic || deck.length < 2) return;
    const timer = setInterval(() => setActive(index => (index + 1) % deck.length), 8000);
    return () => clearInterval(timer);
  }, [automatic, deck.length, active]);
  const move = (index: number) => { setReading(false); setActive((index + deck.length) % deck.length); };
  if (!deck.length) return null;
  return <div className="sws__page sws__page--proof" ref={viewRef}>
    <div className="container sws__proof-inner">
      <div className="sws__proof-head"><MicroLabel>The proof</MicroLabel><SectionTitle as="h2" text="What we do for companies like yours." className="sws__proof-title" scrub={false} /></div>
      <div className="sws__stories" role="region" aria-label="Customer stories" aria-roledescription="carousel" tabIndex={0}
        onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
        onKeyDown={event => { if (deck.length > 1 && (event.key === "ArrowRight" || event.key === "ArrowLeft")) { event.preventDefault(); move(active + (event.key === "ArrowRight" ? 1 : -1)); } }}>
        {deck.map((story,index) => {
          const artwork = CASES.findIndex(item => item.kind === story.kind);
          return <article className="sws__story" key={story.kind} hidden={active !== index} aria-label={story.kind}>
            <div className="sws__story-copy">
              <MicroLabel>{String(index+1).padStart(2,"0")} / {String(deck.length).padStart(2,"0")} · Customer story</MicroLabel>
              <h3>{story.kind}</h3><p>{artwork >= 0 ? SUMMARIES[artwork] : story.body}</p>
              {artwork >= 0 && <details open={active === index && reading} onToggle={event => { if (active === index) setReading(event.currentTarget.open); }}><summary>Read the story</summary><p>{story.body}</p></details>}
            </div>
            {artwork >= 0 && <figure className="sws__financial"><picture><source media="(max-width: 600px)" srcSet={`/editorial/proof-${artwork+1}-mobile.svg`} /><img src={`/editorial/proof-${artwork+1}.svg`} width="960" height="380" loading="lazy" alt={["Company revenue combines to 290, then 30 of intercompany revenue is removed for a group total of 260.","Completed jobs connect to sent invoices and matched payments.","Payroll, bonuses and commissions are recorded for home and overseas teams.","Sales less food costs, payroll and other costs equals profit.","A 120,000 annual contract is recognized as 10,000 of revenue each month.","Furniture deposits are held for client purchases, separate from earned studio fees.","Each credit-line draw has its own interest calculation.","Revenue is broken out across online, wholesale, store and workshop channels.","Current books and a monthly close support investor reporting.","Billed sessions connect to payouts and matching bank records."][artwork]} /></picture><figcaption>Illustrative example</figcaption></figure>}
          </article>;
        })}
        {deck.length > 1 && <div className="sws__proof-controls">
          <div className="sws__navigation">
            {!reduced && <Pill variant="secondary" aria-label={paused ? "Play customer stories" : "Pause customer stories"} onClick={() => setPaused(value => !value)}>{paused ? "▷" : "Ⅱ"}</Pill>}
            <Pill variant="secondary" aria-label="Previous customer story" onClick={() => move(active-1)}>←</Pill>
            <Pill variant="secondary" aria-label="Next customer story" onClick={() => move(active+1)}>→</Pill>
          </div>
          <div className="sws__story-progress" aria-label="Choose a customer story">{deck.map((story,index) => <Pill key={story.kind} variant="ghost" aria-label={`Story ${index+1}: ${story.kind}`} aria-pressed={active === index} onClick={() => move(index)}><span /></Pill>)}</div>
          <span className="sws__story-count">{String(active+1).padStart(2,"0")} / {String(deck.length).padStart(2,"0")}</span>
        </div>}
      </div>
    </div>
  </div>;
}
