import { useEffect, useState } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { useInView } from "../hooks/useInView";
import "./ScalesWithYou.css";

// Bar heights describe Porter's "scales with you" arc — slow start, accelerating climb,
// then a confident plateau at the top. Bars "click into place" left-to-right when the
// section enters view, evoking revenue growing month over month.
const BARS = [12, 16, 22, 28, 36, 48, 60, 74, 88, 98, 110, 120];

type Case = {
  kind: string;
  body: string;
  /** Material Symbols Outlined icon — picked for quiet, lux line-art feel. */
  icon: string;
};

const CASES: Case[] = [
  {
    kind: "Professional services firm",
    icon: "business_center",
    body: "Was missing payments, letting receivables age, and overpaying for tools no one used. Porter centralized AR, AP, payroll, and vendor spend, and showed them exactly what to cancel.",
  },
  {
    kind: "Series B SaaS company",
    icon: "rocket_launch",
    body: "Needed a finance function to run payroll, A/R, A/P, bookkeeping, and financial reporting, with complex revenue recognition and schedules.",
  },
  {
    kind: "Seed-stage health tech",
    icon: "health_and_safety",
    body: "Help with bookkeeping and A/P, plus investor reporting and financial modeling.",
  },
  {
    kind: "Home services business",
    icon: "home_work",
    body: "Fast growing; needed a financial partner to help them understand where to focus resources and curb costs.",
  },
];

// Duplicate the deck so the marquee can loop seamlessly without a hard cut.
const TRACK = [...CASES, ...CASES];

export function ScalesWithYou() {
  return (
    <section className="sws" id="why">
      <ManifestoPage />
      <ProofPage />
    </section>
  );
}

function ManifestoPage() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

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

function ProofPage() {
  return (
    <div className="sws__page sws__page--proof">
      {/* Subtle downward-sloping green gradient — matches the chart-shape
          backdrop pattern the other sections use. */}
      <SectionGradient shape={SHAPES.declining} intensity={0.10} />
      <div className="container sws__proof-head">
        <Reveal>
          <MicroLabel>The proof</MicroLabel>
        </Reveal>
        <SectionTitle
          as="h3"
          text="What we do for companies like yours."
          className="sws__proof-title"
        />
      </div>

      <div className="sws__marquee" aria-label="Customer outcomes">
        <div className="sws__marquee-track">
          {TRACK.map((c, i) => (
            <CaseCard key={`${c.kind}-${i}`} c={c} index={(i % CASES.length) + 1} />
          ))}
        </div>
        {/* Soft side fades — luxury edge treatment. */}
        <div className="sws__fade sws__fade--left" aria-hidden="true" />
        <div className="sws__fade sws__fade--right" aria-hidden="true" />
      </div>
    </div>
  );
}

function CaseCard({ c, index }: { c: Case; index: number }) {
  return (
    <article className="sws__card">
      <div className="sws__card-head">
        <span className="sws__card-mark" aria-hidden="true">
          <span className="material-symbols-outlined">{c.icon}</span>
        </span>
        <span className="sws__card-num">
          {String(index).padStart(2, "0")} · CASE
        </span>
      </div>
      <div className="sws__card-body">
        <div className="sws__card-kind">{c.kind}</div>
        <p className="sws__card-text">{c.body}</p>
      </div>
    </article>
  );
}
