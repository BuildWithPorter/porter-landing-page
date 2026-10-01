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
      { label: "Unclear reports", title: "Your reports arrive. The answers don’t.", challenge: "Your provider sends the totals, but you’re still left figuring out what changed, why it happened, and what to do next.", film: 2, alt: "A financial report contains totals, while a separate unanswered question asks what changed and why." },
      { label: "Repeating yourself", title: "You explain your business. Then explain it again.", challenge: "The context gets lost between emails, messages and month-end questions. You keep reminding your provider what the same transactions were for.", film: 13, alt: "Messages from successive months ask for the same explanation, illustrating repeated work." },
      { label: "Unpaid work", title: "You finished the work. The invoice never went out.", challenge: "Invoicing and follow-ups fall between you and your provider. Completed work stays unbilled, and cash arrives later than it should.", film: 3, alt: "A completed job sits apart from an invoice that has not been sent." },
      { label: "Disconnected tools", title: "You have the tools. You still assemble the picture.", challenge: "Your books, payments, messages and spreadsheets live in different places. You become the person who has to connect them.", film: 5, alt: "Four separate records for accounting, spreadsheets, messages and payments have no connections between them." },
    ];
    const story = stories[active];
    return <section className="pain pain--cinematic section" id="pain"><SectionGradient shape={SHAPES.declining} intensity={0.07} />
      <div className="container pain__inner">
        <div className="pain__heading"><MicroLabel>The challenges</MicroLabel><SectionTitle text="When your finance setup holds you back." scrub={false} /><p>Challenges with your current provider or tools. Select one to explore.</p></div>
        <div className="pain__choices" aria-label="Choose a challenge">{stories.map((item,i) => <Pill key={item.label} variant={active === i ? "primary" : "secondary"} aria-pressed={active === i} aria-controls="challenge-story" onClick={() => setActive(i)}><span>{String(i+1).padStart(2,"0")} / {item.label}</span><span aria-hidden="true">{active === i ? "−" : "+"}</span></Pill>)}</div>
        <div className="pain__experience" id="challenge-story">
          <div className="pain__story" key={story.title}><MicroLabel>With your current setup</MicroLabel><SectionTitle as="h3" text={story.title} scrub={false} /><p>{story.challenge}</p><a href={`/use-cases/${USE_CASES.find(item => item.id === story.film)!.slug}`}>See how Porter helps ↗</a></div>
          <figure className="pain__art" key={active}><img src={`/challenges/challenge-${active+1}.jpg`} width="1440" height="1080" loading="lazy" alt={story.alt} /><figcaption>Illustrative example · before Porter</figcaption></figure>
        </div>
      </div></section>;
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
