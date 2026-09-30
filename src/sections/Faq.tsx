import { Head } from "vite-react-ssg";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { securityFaq } from "../legal/securityContent";
import "./Faq.css";

// Each FAQ pair becomes both visible accordion content AND a node inside the
// FAQPage JSON-LD block below. AI engines (Google AI Overviews, ChatGPT,
// Perplexity) treat FAQPage schema as a primary citation source — these
// answers get extracted and credited verbatim when users ask matching
// questions. So the answers should be self-contained: full sentences, no
// "see above," strong opening line that stands alone if quoted.

type Item = { q: string; a: string };

const FAQS: Item[] = [
  {
    "q": "What is Porter?",
    "a": "Porter is your finance team and the software you use to work with them. We handle your books and day-to-day finances. You get current numbers, clear answers, and people who know your business."
  },
  {
    "q": "Who is Porter for?",
    "a": "Founders and operators who want their finances handled. Porter works with startups, service businesses, restaurants, studios, and groups with more than one company."
  },
  {
    "q": "Does Porter replace QuickBooks?",
    "a": "It can. Use Porter as your accounting system, or connect your existing QuickBooks Online account and have Porter work alongside it. Your team will help you choose the right starting point."
  },
  {
    "q": "What can the team take off my plate?",
    "a": "Bookkeeping, month end, invoices, payment follow-ups, bills, payroll, and reporting. Start with the services you need and add more as your business grows."
  },
  {
    "q": "Can I use Porter in ChatGPT or Claude?",
    "a": "Yes. Connect Porter to ChatGPT or Claude and ask questions about your books in the chat you already use. You can also work in the Porter app, ask in Slack, or reply to Porter by text."
  },
  {
    "q": "Can Porter handle more than one company?",
    "a": "Yes. Keep each company’s books separate and see the group together. Porter brings company results into group reports and removes matching activity between your companies."
  },
  {
    "q": "How do we get started?",
    "a": "Tell us about your business and what you want help with. The Porter team will recommend a plan, connect your systems, and work through the move with you."
  },
  {
    "q": "How is pricing set?",
    "a": "Your plan reflects the services your business needs. Tell us what you want handled and we will recommend a scope and price."
  }
,
  securityFaq,
];

// Reason (POR-3087): `items` swaps the list (and the FAQPage JSON-LD built from
// it) for an industry page; the homepage passes nothing and keeps FAQS.
export function Faq({ items }: { items?: Item[] } = {}) {
  const shown = items ?? FAQS;

  // FAQPage JSON-LD — extracts the same Q&A pairs into structured data
  // that AI search engines and Google AI Overviews ingest directly.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": shown.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a,
      },
    })),
  };

  return (
    <section className="faq section" id="faq">
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Head>

      <div className="container faq__inner">
        <div className="faq__heading"><MicroLabel>Common questions</MicroLabel><SectionTitle text="A few things worth knowing." className="faq__title" scrub={false} /><p>The practical details,<br />before we get to know your business.</p></div>
        <div className="faq__list">
          {shown.map((f,i) => <details key={f.q} className="faq__item" name="porter-faq" open={i === 0 ? true : undefined}>
            <summary className="faq__q"><span className="faq__number">{String(i+1).padStart(2,"0")}</span><span className="faq__q-text">{f.q}</span><span className="faq__q-marker" aria-hidden="true">+</span></summary>
            <div className="faq__a">{f.a}</div>
          </details>)}
        </div>
      </div>
    </section>
  );
}
