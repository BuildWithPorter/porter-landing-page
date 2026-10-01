import { useState, type ReactElement } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { PainBooks } from "../illustrations/PainBooks";
import { PainBookkeeper } from "../illustrations/PainBookkeeper";
import { PainInvoices } from "../illustrations/PainInvoices";
import { PainTools } from "../illustrations/PainTools";
import type { PainIllustration } from "../industries/types";
import "./Pain.css";

type IllustrationComponent = (props: { active?: boolean }) => ReactElement;

type Card = {
  num: string;
  quote: string;
  body: string;
  Illustration: IllustrationComponent;
};

const ILLUSTRATIONS: Record<PainIllustration, IllustrationComponent> = {
  books: PainBooks,
  bookkeeper: PainBookkeeper,
  invoices: PainInvoices,
  tools: PainTools,
};

// Reason (POR-3087): industry pages pass their own title and four cards. Cards pick
// one of the four existing illustrations by key rather than shipping new artwork per
// industry. The homepage uses the separate Challenges section, so the old homepage
// default cards were removed and both props are required.
type PainProps = {
  title: string;
  cards: { quote: string; body: string; illustration: PainIllustration }[];
};

export function Pain({ title, cards }: PainProps) {
  const [active, setActive] = useState(0);
  const shown: Card[] = cards.map((c, i) => ({
    num: String(i + 1).padStart(2, "0"),
    quote: c.quote,
    body: c.body,
    Illustration: ILLUSTRATIONS[c.illustration],
  }));

  // Active column flexes wider; inactives stay narrow but uniform.
  const gridCols = shown.map((_, i) => (i === active ? "2fr" : "1fr")).join(" ");

  return (
    <section className="pain section" id="pain">
      <SectionGradient shape={SHAPES.declining} intensity={0.07} />
      <div className="container pain__inner">
        <Reveal>
          <MicroLabel>The challenges</MicroLabel>
        </Reveal>
        <SectionTitle text={title} className="pain__title" />

        <Reveal delay={120}>
          <div className="pain__strip" role="tablist" aria-label="Business challenges" style={{ gridTemplateColumns: gridCols }}>
            {shown.map((c, i) => {
              const isActive = i === active;
              const { Illustration } = c;
              return (
                <button
                  key={c.num}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(i)}
                  className={`pain__card ${isActive ? "is-active" : ""}`}
                >
                  <div className="pain__illu">
                    <Illustration active={isActive} />
                  </div>
                  <div className="pain__meta">
                    <div className="pain__num">{c.num}</div>
                    <h3 className="pain__quote">&ldquo;{c.quote}&rdquo;</h3>
                    {/* Always render so mobile can reveal all bodies via CSS.
                        Desktop hides the body for inactive cards. */}
                    <p className="pain__body">{c.body}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
