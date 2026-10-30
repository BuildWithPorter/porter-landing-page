import { Head } from "vite-react-ssg";
import { SectionTitle } from "../primitives/SectionTitle";
import { securityFaq } from "../legal/securityContent";
import { FAQS } from "../content/faq";
import { faqPageJsonLd } from "../content/faqPageJsonLd";
import "./Faq.css";

// Visible answers and structured data use the same content.
type Item = { q: string; a: string; more?: { href: string; label: string } };

// Reason (POR-3087): `items` swaps the list (and the FAQPage JSON-LD built from
// it) for an industry page; the homepage passes nothing and keeps FAQS.
export function Faq({ items, heading = "Common questions.", providerId }: { items?: Item[]; heading?: string; providerId?: string } = {}) {
  const shown: Item[] = items ?? [...FAQS, securityFaq];

  // FAQPage describes the visible questions; it does not promise search placement.
  // A follow-on link is navigation, not part of the answer text.
  const faqJsonLd = faqPageJsonLd(shown, providerId);

  return (
    <section className="faq section" id="faq">
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Head>

      <div className="container faq__inner">
        <div className="faq__heading"><SectionTitle text={heading} className="faq__title" scrub={false} /></div>
        <div className="faq__list">
          {shown.map((f,i) => <details key={f.q} className="faq__item" name="porter-faq">
            <summary className="faq__q"><span className="faq__number">{String(i+1).padStart(2,"0")}</span><span className="faq__q-text">{f.q}</span><span className="faq__q-marker" aria-hidden="true">+</span></summary>
            <div className="faq__a">{f.a}{f.more ? <a className="faq__more" href={f.more.href}>{f.more.label}</a> : null}</div>
          </details>)}
        </div>
      </div>
    </section>
  );
}
