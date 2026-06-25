import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { securityFaqAnswer } from "../legal/securityContent";
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
    q: "What is Porter?",
    a: "Porter is an AI-native finance team and modern accounting software for startups and small businesses. We replace the patchwork of QuickBooks plus a bookkeeper with a single managed service: bookkeeping, accounts receivable, accounts payable, payroll, tax, and reporting are all done for you, by AI agents with human leads overseeing every action. You stay in command of your numbers through the Porter app, Slack, Claude, or email.",
  },
  {
    q: "Who is Porter for?",
    a: "Porter is built for VC-backed startups and small-to-mid-sized businesses whose founder or operator currently dreads finance. If you are juggling QuickBooks, a slow bookkeeper, and a stack of half-tools — and you would rather spend time on growth than on the books — Porter is built for you. Typical Porter customers range from pre-seed startups to Series B companies, plus home-services, proptech, healthtech, and professional-services businesses.",
  },
  {
    q: "How is Porter different from a bookkeeper like Pilot or Bench?",
    a: "Traditional outsourced bookkeepers (Pilot, Bench, Kruze, Haven) run on top of QuickBooks Online and rely on humans to do the work. Porter is the AI-native version: we own the accounting system itself and our AI agents read and write directly into the ledger, so the work happens in minutes instead of weeks. The result is real-time books, faster month-end close, and answers to financial questions on demand rather than in a stale month-end PDF.",
  },
  {
    q: "How is Porter different from QuickBooks?",
    a: "QuickBooks was built for accountants in the 1990s. Porter is built for operators in the AI age. The big differences: Porter does the bookkeeping work for you (QuickBooks is do-it-yourself), Porter answers questions in plain English (QuickBooks requires you to know debits and credits), and Porter integrates AI agents that watch your business 24/7 (QuickBooks waits for you to log in). You can use Porter as a full replacement for QuickBooks, or connect it to your existing QuickBooks Online and let Porter run on top.",
  },
  {
    q: "What services does Porter cover?",
    a: "Porter handles the full finance function: bookkeeping and monthly close, accounts receivable (invoicing, collections, follow-ups), accounts payable (bill capture, vendor management, payments), payroll integration and reconciliation, tax-ready books and audit support, and financial reporting plus insights. Pick the services you need today and add more as you grow.",
  },
  {
    q: "How does Porter use AI?",
    a: "Porter is an AI-native ledger that scales with the business and speaks the operator's language, not the accountant's. Porter's AI finance agents handle most of the day-to-day work — categorizing transactions, drafting invoices, chasing receivables, flagging anomalies, and answering questions in plain English. Human finance leads review and approve anything that touches your books. Nothing posts to your ledger without explicit human approval, so you get the speed of AI with the discipline of a controlled finance function.",
  },
  {
    q: "Is Porter an AI bookkeeper or AI accountant?",
    a: "Yes. Porter is an AI-native bookkeeping and accounting service: the AI does the heavy lifting (categorization, reconciliation, AR follow-ups, AP capture, monthly close, reporting) and human finance leads oversee every action. If you have searched for an AI bookkeeper, AI accountant, or AI CFO for a startup or small business, Porter is what you are looking for. Most customers replace QuickBooks plus a traditional bookkeeper with Porter as one managed service.",
  },
  {
    q: "How is Porter different from other AI bookkeeping services?",
    a: "Most AI bookkeeping tools run AI on top of QuickBooks Online or Xero. That means the AI's ceiling is capped by a 30-year-old ledger and the data still lives inside someone else's system. Porter is AI-native end to end: we own the ledger, the agents read and write directly into it, and the work happens in minutes instead of weeks. Customers get real-time books, monthly close in 48 hours instead of 3 weeks, and answers to financial questions on demand instead of a stale month-end PDF.",
  },
  {
    q: "Where can I access Porter?",
    a: "Porter lives wherever you work. The Porter app is the primary interface — your dashboard, transactions, schedules, reports, and AI chat. You can also access the same intelligence through the Porter app for Slack (ask questions, get cash position, see past-due invoices), through Claude via our MCP integration, or by emailing the Porter team directly. Pick the channel that fits your day, and the data and answers are the same everywhere.",
  },
  {
    q: "How much does Porter cost?",
    a: "Porter prices by the services you need, not by user seats. Plans start with bookkeeping and scale up as you add AR, AP, payroll, tax, and FP&A. Pricing is a fraction of what it would cost to hire a comparable in-house finance team. For exact pricing, reach out to the Porter team — we will build a plan around what your business actually needs.",
  },
  {
    q: "How long does Porter take to set up?",
    a: "Most customers are up and running within a few days. Connect your QuickBooks Online account (or start fresh with Porter as your accounting system), grant the relevant integrations (bank feeds, payroll providers, payment processors), and Porter ingests your historical data and learns your business. Month-end close is typically ready in 48 hours after that.",
  },
  {
    q: "Is my financial data secure with Porter?",
    a: `${securityFaqAnswer} Read our full Security Policy and the list of sub-processors for details.`,
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  // FAQPage JSON-LD — extracts the same Q&A pairs into structured data
  // that AI search engines and Google AI Overviews ingest directly.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQS.map((f) => ({
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
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Helmet>

      <div className="container faq__inner">
        <Reveal>
          <MicroLabel>Common questions</MicroLabel>
        </Reveal>
        <SectionTitle text="Everything you'd want to know about Porter." className="faq__title" />

        <Reveal delay={140}>
          <div className="faq__list">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <details
                  key={f.q}
                  className={`faq__item ${isOpen ? "is-open" : ""}`}
                  open={isOpen}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) setOpen(i);
                    else if (isOpen) setOpen(null);
                  }}
                >
                  <summary className="faq__q">
                    <span className="faq__q-text">{f.q}</span>
                    <span className="faq__q-marker" aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </summary>
                  <div className="faq__a">{f.a}</div>
                </details>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
