import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, FEATURED_CASES, USE_CASES, type Category, type UseCase } from "../content/useCases";
import { SectionTitle } from "../primitives/SectionTitle";
import { MicroLabel } from "../primitives/MicroLabel";
import { HairlineCard } from "../primitives/HairlineCard";
import { Pill } from "../primitives/Pill";
import { UseCaseFilm } from "../components/UseCaseFilm";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import "./UseCaseGallery.css";

export function UseCaseGallery({ teaser = false, embedded = false }: { teaser?: boolean; embedded?: boolean }) {
  const [category, setCategory] = useState<Category>("All");
  const items = teaser ? FEATURED_CASES : USE_CASES.filter(item => category === "All" || item.category === category);
  return <section className={`use-gallery section ${teaser || embedded ? "use-gallery--teaser" : ""}`} id="see-porter-work">
    <div className="container">
      <div className="use-gallery__intro">
        <div><MicroLabel>{teaser ? "See Porter work" : "The use-case collection"}</MicroLabel>
          <SectionTitle as={teaser || embedded ? "h2" : "h1"} text={teaser ? "Less chasing. More knowing." : "See Porter work."} scrub={false} />
        </div>
        <p>From the invoice nobody sent to the decision you haven't made yet. See what Porter does, and what changes for you.</p>
      </div>
      {!teaser && <div className="use-gallery__filters" aria-label="Filter use cases">
        {CATEGORIES.map(value => <Pill key={value} variant={category === value ? "primary" : "ghost"} aria-pressed={category === value} onClick={() => {
          setCategory(value); trackMarketingEvent("use_case_filter", { category: value });
        }}>{value}</Pill>)}
      </div>}
      <div className="use-gallery__index"><span>{teaser ? "A few places to begin" : `${items.length} ways Porter can help`}</span><span>Watch. Explore. Ask.</span></div>
      <div className="use-gallery__grid">
        {items.map((item, index) => <UseCaseCard key={item.slug} item={item} position={index + 1} priority={!teaser && index === 0} heading={teaser || embedded ? "h3" : "h2"} />)}
      </div>
      {teaser && <div className="use-gallery__footer"><span>One finance team. Twenty ways to get your time back.</span><Pill href="/use-cases" variant="secondary">Explore all 20 use cases <span aria-hidden="true">↗</span></Pill></div>}
    </div>
  </section>;
}

function UseCaseCard({ item, position, priority, heading: Heading }: { item: UseCase; position: number; priority: boolean; heading: "h2" | "h3" }) {
  const href = `/use-cases/${item.slug}`;
  return <HairlineCard className="use-card" onClick={event => {
    if ((event.target as HTMLElement).closest("a")) trackMarketingEvent("use_case_card_click", { slug: item.slug, position });
  }}>
    <UseCaseFilm item={item} href={href} priority={priority} />
    <div className="use-card__copy"><MicroLabel>{String(position).padStart(2, "0")} / {item.category}</MicroLabel>
      <Heading className="use-card__title"><Link to={href}>{item.title}<span aria-hidden="true">↗</span></Link></Heading><p>{item.result}</p>
    </div>
  </HairlineCard>;
}
