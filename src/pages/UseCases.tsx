import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { WaitlistProvider, useWaitlist } from "../components/WaitlistDialog";
import { Seo } from "../components/Seo";
import { Nav } from "../primitives/Nav";
import { Footer } from "../primitives/Footer";
import { Pill } from "../primitives/Pill";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { UseCaseGallery } from "../sections/UseCaseGallery";
import { UseCaseFilm } from "../components/UseCaseFilm";
import { USE_CASES } from "../content/useCases";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import "./UseCases.css";

export function UseCasesPage() {
  return <WaitlistProvider><Seo title="See Porter work | 20 ways to simplify your finances" description="See Porter handle invoices, answer questions, explain your numbers and help you plan. Explore 20 short product demonstrations." path="/use-cases" /><Nav /><main><UseCaseGallery /><Footer /></main></WaitlistProvider>;
}
export function UseCasePage() {
  const { slug } = useParams();
  return <WaitlistProvider><UseCaseDetail key={slug} slug={slug} /></WaitlistProvider>;
}
function UseCaseDetail({ slug }: { slug?: string }) {
  const index = USE_CASES.findIndex(item => item.slug === slug);
  const item = USE_CASES[index];
  const { open } = useWaitlist();
  useEffect(() => {
    if (item) { window.scrollTo({ top: 0, behavior: "instant" }); trackMarketingEvent("use_case_view", { slug: item.slug }); }
  }, [item]);
  if (!item) return <><Seo title="Use case not found | Porter" description="Explore what Porter does." robots="noindex" /><Nav /><main className="use-detail container"><h1>That use case wasn't found.</h1><Link to="/use-cases">Explore all use cases</Link></main></>;
  const previous = USE_CASES[(index - 1 + USE_CASES.length) % USE_CASES.length];
  const next = USE_CASES[(index + 1) % USE_CASES.length];
  return <><Seo title={`${item.title} | Porter`} description={`${item.during} ${item.result}`} path={`/use-cases/${item.slug}`} image={`https://buildwithporter.com/use-cases/${item.slug}/${item.slug}-poster.jpg`} />
    <Nav /><main className="use-detail"><div className="container">
      <Link className="use-detail__back" to="/use-cases">← All use cases</Link>
      <div className="use-detail__heading"><MicroLabel>{String(item.id).padStart(2,"0")} / {item.category}</MicroLabel><SectionTitle as="h1" text={item.title} scrub={false} /></div>
      <div className="use-detail__body"><UseCaseFilm item={item} priority /><div className="use-detail__story">
        {[["Without Porter",item.before],["With Porter",item.during],["The result",item.result]].map(([label,body]) => <div key={label}><MicroLabel>{label}</MicroLabel><p>{body}</p></div>)}
        {item.id === 17 && <Link className="use-detail__slack" to="/slack">Explore Porter for Slack ↗</Link>}
        <Pill onClick={() => { trackMarketingEvent("use_case_cta_click", { slug: item.slug }); open(); }}>Get a recommendation <span aria-hidden="true">↗</span></Pill>
      </div></div>
      <nav className="use-detail__neighbors" aria-label="Neighboring use cases"><Link to={`/use-cases/${previous.slug}`}><MicroLabel>← Previous</MicroLabel><span>{previous.title}</span></Link><Link to={`/use-cases/${next.slug}`}><MicroLabel>Next →</MicroLabel><span>{next.title}</span></Link></nav>
    </div><Footer /></main></>;
}
