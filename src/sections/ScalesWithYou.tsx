import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, () => true);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginInteraction = () => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    setInteracting(true);
  };
  const endInteraction = () => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setInteracting(false), 1800);
  };
  useEffect(() => () => { if (interactionTimer.current) clearTimeout(interactionTimer.current); }, []);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    if (viewRef.current) observer.observe(viewRef.current);
    return () => observer.disconnect();
  }, []);
  const deck = cases ?? CASES;
  const automatic = !cases && !reduced && !paused && !interacting && !hovering && !focused && inView;
  useEffect(() => {
    const el = rail.current;
    if (!el || !automatic) return;
    let frame = 0;
    let previous = 0;
    let position = el.scrollLeft;
    const tick = (now: number) => {
      const first = el.children[0] as HTMLElement;
      const clone = el.children[deck.length] as HTMLElement;
      const cycle = clone ? clone.offsetLeft - first.offsetLeft : 0;
      if (previous && !document.hidden && cycle) {
        position += Math.min(now - previous, 50) * 0.028;
        if (position >= cycle) position -= cycle;
        el.scrollLeft = position;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [automatic, deck.length]);
  const move = (direction: number) => {
    beginInteraction();
    endInteraction();
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * ((el.children[0] as HTMLElement).offsetWidth + (Number.parseFloat(getComputedStyle(el).columnGap) || 0)), behavior: reduced ? "instant" : "smooth" });
  };
  return <div className="sws__page sws__page--proof" ref={viewRef}>
    <div className="container sws__proof-head">
      <div><MicroLabel>The proof</MicroLabel><SectionTitle as="h2" text="What we do for companies like yours." className="sws__proof-title" scrub={false} /></div>
      {!cases && <div className="sws__navigation">
        {!reduced && <Pill variant="secondary" className="sws__pause" aria-label={paused ? "Play customer stories" : "Pause customer stories"} onClick={() => setPaused(value => !value)}>{paused ? "Play" : "Pause"}</Pill>}
        <Pill variant="secondary" aria-label="Previous customer story" onClick={() => move(-1)}>←</Pill>
        <Pill variant="secondary" aria-label="Next customer story" onClick={() => move(1)}>→</Pill>
      </div>}
    </div>
    <div className={`container ${cases ? "sws__static" : "sws__rail"}`} ref={rail}
      aria-label="Customer stories" tabIndex={cases ? undefined : 0}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onTouchStart={beginInteraction} onTouchEnd={endInteraction} onTouchCancel={endInteraction}
      onWheel={event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) { beginInteraction(); endInteraction(); } }}
      onKeyDown={event => { if (!cases && (event.key === "ArrowRight" || event.key === "ArrowLeft")) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
      {deck.map((c,i) => <CaseCard key={c.kind} c={c} index={i+1} />)}
      {!cases && !reduced && deck.map((c,i) => <CaseCard key={`loop-${c.kind}`} c={c} index={i+1} duplicate />)}
    </div>
    {!cases && <div className="container sws__proof-foot"><span>Different businesses. One finance team.</span><span>{reduced ? "Scroll to explore" : "Plays automatically. Hover to pause."}</span></div>}
  </div>;
}
function CaseCard({ c, index, duplicate = false }: { c: Case; index: number; duplicate?: boolean }) {
  const artwork = CASES.findIndex(story => story.kind === c.kind);
  return <HairlineCard className="sws__card" role="article" aria-label={c.kind} aria-hidden={duplicate || undefined} inert={duplicate || undefined} tabIndex={duplicate ? undefined : 0}>
    <div className="sws__card-head"><span className="sws__card-num">{String(index).padStart(2,"0")}</span><span>Customer story</span></div>
    {artwork >= 0 && <div className="sws__art"><img src={`/proof/story-${artwork+1}.svg`} width="650" height="300" loading="lazy" alt="" /><span>Illustrated workflow</span></div>}
    <div className="sws__card-body"><h3 className="sws__card-kind">{c.kind}</h3><p className="sws__card-text">{c.body}</p></div>
  </HairlineCard>;
}
