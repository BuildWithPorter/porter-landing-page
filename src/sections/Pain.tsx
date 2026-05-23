import { useState, type ReactElement } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { PainBooks } from "../illustrations/PainBooks";
import { PainBookkeeper } from "../illustrations/PainBookkeeper";
import { PainInvoices } from "../illustrations/PainInvoices";
import { PainTools } from "../illustrations/PainTools";
import "./Pain.css";

type IllustrationComponent = (props: { active?: boolean }) => ReactElement;

type Card = {
  num: string;
  quote: string;
  body: string;
  Illustration: IllustrationComponent;
};

const CARDS: Card[] = [
  {
    num: "01",
    quote: "I dread looking at my books.",
    body: "QuickBooks, Xero, Sage: they were built for accountants. Debits, credits, jargon you never wanted to learn. So you avoid them, and you feel disconnected from your own numbers.",
    Illustration: PainBooks,
  },
  {
    num: "02",
    quote: "My bookkeeper doesn't know my business.",
    body: "They juggle dozens of clients, reply slowly, and scatter the conversation across email, Slack, and text. You re-explain your business every month and still get a stale report weeks late.",
    Illustration: PainBookkeeper,
  },
  {
    num: "03",
    quote: "Invoices and bills fall through the cracks.",
    body: "Customers pay late because no one is chasing them. Vendors get paid twice, or too early, or not at all. There is no process, just you, remembering.",
    Illustration: PainInvoices,
  },
  {
    num: "04",
    quote: "I'd rather spend on growth than finance.",
    body: "So you settle for a patchwork of half-tools that does not help you run the business. But finance is supposed to be a business tool: it should tell you how to make more and spend less.",
    Illustration: PainTools,
  },
];

const TITLE = "For most startup and SMB owners, finance is a chore and rarely front of mind.";

export function Pain() {
  const [active, setActive] = useState(0);

  // Active column flexes wider; inactives stay narrow but uniform.
  const gridCols = CARDS.map((_, i) => (i === active ? "2fr" : "1fr")).join(" ");

  return (
    <section className="pain section" id="pain">
      <SectionGradient shape={SHAPES.declining} />
      <div className="container pain__inner">
        <Reveal>
          <MicroLabel>The problem</MicroLabel>
        </Reveal>
        <SectionTitle text={TITLE} className="pain__title" />

        <Reveal delay={120}>
          <div className="pain__strip" role="tablist" aria-label="Pain points" style={{ gridTemplateColumns: gridCols }}>
            {CARDS.map((c, i) => {
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
