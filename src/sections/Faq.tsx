import { Head } from "vite-react-ssg";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { securityFaq } from "../legal/securityContent";
import { FAQS } from "../content/faq";
import "./Faq.css";

// Visible answers and structured data use the same content.
type Item = { q: string; a: string };

// Reason (POR-3087): `items` swaps the list (and the FAQPage JSON-LD built from
// it) for an industry page; the homepage passes nothing and keeps FAQS.
export function Faq({ items }: { items?: Item[] } = {}) {
  const shown = items ?? [...FAQS, securityFaq];

  // FAQPage describes the visible questions; it does not promise search placement.
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
