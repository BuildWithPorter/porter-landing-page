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
import { Pill } from "../primitives/Pill";
import { UseCaseFilm } from "../components/UseCaseFilm";
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
  title?: string;
  cards?: { quote: string; body: string; illustration: PainIllustration }[];
};

export function Pain({ title, cards, cinematic = false }: PainProps = {}) {
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
    const stories = [
      { title: "Numbers you can’t use.", problem: "Reports arrive after the decision. You see totals, but still don’t know what changed or what to do next.", result: "Ask a question. Follow the answer into the numbers behind it.", film: 2 },
      { title: "The same explanations, every month.", problem: "Your finance work lives across conversations. You keep reminding people what each transaction was for.", result: "Porter learns the way your business works and carries that context forward.", film: 13 },
      { title: "Work done. Money missing.", problem: "A finished job never becomes an invoice. Follow-ups slip. Cash arrives later than it should.", result: "Connect completed work to invoices and keep collections moving.", film: 3 },
      { title: "A business spread across tools.", problem: "Every company has its own books. You spend time piecing them together before you can see the whole picture.", result: "Bring the companies together, with a clear view of each one and the group.", film: 5 },
    ];
    const story = stories[active];
    return <section className="pain pain--cinematic section" id="pain"><SectionGradient shape={SHAPES.declining} />
      <div className="container pain__inner"><div className="pain__choices" aria-label="Choose a business problem">{stories.map((story,i) => <Pill key={story.title} variant={active === i ? "primary" : "ghost"} aria-pressed={active === i} onClick={() => setActive(i)}>{String(i+1).padStart(2,"0")} / {['Clarity','Context','Cash','Complexity'][i]}</Pill>)}</div>
        <div className="pain__experience"><div className="pain__story" key={story.title}><MicroLabel>The problem</MicroLabel><SectionTitle text={story.title} scrub={false} /><p>{story.problem}</p><div className="pain__resolution"><MicroLabel>What changes with Porter</MicroLabel><p>{story.result}</p></div><a href={`/use-cases/${USE_CASES.find(item => item.id === story.film)!.slug}`}>Explore this example ↗</a></div>
        <UseCaseFilm key={story.film} item={USE_CASES.find(item => item.id === story.film)!} priority /></div>
      </div></section>;
  }

  // Active column flexes wider; inactives stay narrow but uniform.
  const gridCols = shown.map((_, i) => (i === active ? "2fr" : "1fr")).join(" ");

  return (
    <section className="pain section" id="pain">
      <SectionGradient shape={SHAPES.declining} />
      <div className="container pain__inner">
        <Reveal>
          <MicroLabel>The problem</MicroLabel>
        </Reveal>
        <SectionTitle text={title ?? TITLE} className="pain__title" />

        <Reveal delay={120}>
          <div className="pain__strip" role="tablist" aria-label="Pain points" style={{ gridTemplateColumns: gridCols }}>
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
