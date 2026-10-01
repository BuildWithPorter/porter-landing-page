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
import { USE_CASES } from "../content/useCases";

type IllustrationComponent = (props: { active?: boolean }) => ReactElement;

type Card = {
  num: string;
  quote: string;
  body: string;
  Illustration: IllustrationComponent;
};

const DEFAULT_CARDS: Card[] = [
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

const ILLUSTRATIONS: Record<PainIllustration, IllustrationComponent> = {
  books: PainBooks,
  bookkeeper: PainBookkeeper,
  invoices: PainInvoices,
  tools: PainTools,
};

// Reason (POR-3087): industry pages pass their own title and four cards; the
// homepage passes nothing and keeps DEFAULT_CARDS/TITLE. Cards pick one of the four
// existing illustrations by key rather than shipping new artwork per industry.
type PainProps = {
  cinematic?: boolean;
  standalone?: boolean;
  title?: string;
  cards?: { quote: string; body: string; illustration: PainIllustration }[];
};

export function Pain({ title, cards, cinematic = false, standalone = false }: PainProps = {}) {
  const [active, setActive] = useState(0);
  const shown: Card[] = cards
    ? cards.map((c, i) => ({
        num: String(i + 1).padStart(2, "0"),
        quote: c.quote,
        body: c.body,
        Illustration: ILLUSTRATIONS[c.illustration],
      }))
    : DEFAULT_CARDS;

  if (cinematic) {
    const challenges = [
      { title: "Reports arrive without the answers you need.", film: 2, alt: "A monthly report shows totals, but leaves the changes unexplained." },
      { title: "The same transactions. The same questions.", film: 13, alt: "Three follow-ups ask you to explain a payment again." },
      { title: "Completed work goes uninvoiced or unpaid.", film: 3, alt: "An outstanding invoice remains unpaid." },
      { title: "Disconnected tools leave you doing the connecting.", film: 5, alt: "Spreadsheets, accounting, payments and messages connect through tangled lines." },
    ];
    return <section className="pain pain--cinematic section" id="pain">
      <div className="container pain__inner">
        <div className="pain__heading"><MicroLabel>What we solve</MicroLabel><SectionTitle as={standalone ? "h1" : "h2"} text="Finance shouldn’t slow you down." scrub={false} /><p>The challenges with your current finance setup.</p></div>
        <div className="pain__overview">
          {challenges.map((item, index) => <a className="pain__challenge" key={item.film} href={`/use-cases/${USE_CASES.find(film => film.id === item.film)!.slug}`}>
            <img src={`/editorial/challenge-${index+1}.svg`} width="300" height="280" loading="lazy" alt={item.alt} />
            <span className="pain__index">{String(index+1).padStart(2,"0")}<span aria-hidden="true">↗</span></span>
            <h3>{item.title}</h3>
          </a>)}
        </div>
      </div>
    </section>;
  }

  // Active column flexes wider; inactives stay narrow but uniform.
  const gridCols = shown.map((_, i) => (i === active ? "2fr" : "1fr")).join(" ");

  return (
    <section className="pain section" id="pain">
      <SectionGradient shape={SHAPES.declining} intensity={0.07} />
      <div className="container pain__inner">
        <Reveal>
          <MicroLabel>The challenges</MicroLabel>
        </Reveal>
        <SectionTitle text={title ?? TITLE} className="pain__title" />

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
