import type { ReactNode } from "react";
import { WaitlistProvider } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { ORGANIZATION_ID } from "../content/faqPageJsonLd";
import type { TopicPage as TopicPageContent, TopicSection } from "../content/topicPages";
import { Footer } from "../primitives/Footer";
import { MicroLabel } from "../primitives/MicroLabel";
import { Nav } from "../primitives/Nav";
import { SectionTitle } from "../primitives/SectionTitle";
import { Faq } from "../sections/Faq";
import { FinalCTA } from "../sections/FinalCTA";
import "./SitePages.css";
import "./TopicPage.css";

const NEXT_STEP = {
  eyebrow: "Next step",
  title: "Tell us about your business and what you want handled.",
  body: "The Porter team will recommend a plan and a scope.",
};

export function TopicPageView({ page }: { page: TopicPageContent }) {
  return (
    <WaitlistProvider>
      <Seo title={page.title} description={page.description} path={page.path} />
      <Nav multiEntity={page.campaign} />
      <main className="site-page topic-page">
        <header className="container site-page__intro topic-page__intro">
          <SectionTitle as="h1" scrub={false} text={page.h1} />
          <p>{page.lede}</p>
        </header>
        {page.sections.map((section) => (
          <section key={section.title} className="container topic-page__section">
            <SectionTitle as="h2" scrub={false} text={section.title} />
            <TopicBlock section={section} />
          </section>
        ))}
        <Faq items={page.faqs} heading="Common questions" providerId={ORGANIZATION_ID} />
        <nav className="container topic-page__related" aria-label="Related">
          <MicroLabel>Related</MicroLabel>
          <ul>
            {page.related.map((item) => (
              <li key={item.href}><a href={item.href}>{item.label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="closing">
          <FinalCTA eyebrow={NEXT_STEP.eyebrow} title={NEXT_STEP.title} body={NEXT_STEP.body} />
          <Footer homeOrigin={page.campaign ? "https://buildwithporter.com" : ""} />
        </div>
      </main>
    </WaitlistProvider>
  );
}

function TopicBlock({ section }: { section: TopicSection }) {
  if (section.kind === "prose") {
    return (
      <div className="topic-page__prose">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}><RichText text={paragraph} /></p>
        ))}
      </div>
    );
  }
  if (section.kind === "list") {
    return (
      <ul className="topic-page__list">
        {section.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  if (section.kind === "points") {
    return (
      <div className="topic-page__points">
        {section.items.map((item) => (
          <article key={item.lead} className="topic-page__point">
            <h3>{item.lead}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    );
  }
  if (section.kind === "steps") {
    return (
      <ol className="topic-page__steps">
        {section.items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    );
  }
  return (
    <div className="topic-page__table-wrap">
      <table className="topic-page__table" aria-label={section.title}>
        <thead>
          <tr>{section.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${section.columns[index]}`} data-label={section.columns[index]}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(<a key={index} href={match[2]}>{match[1]}</a>);
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
