import { useState } from "react";
import { Pill } from "../primitives/Pill";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import "./WhatPorterDoes.css";
import { SERVICES } from "../content/sitePages";

// Reason (POR-3087): industry pages replace the generic services mock with the
// specific things Porter does for that industry, each backed by production
// evidence (see src/industries/<key>.ts). With no `items`, the homepage mock and
// its mobile stand-in render exactly as before.
type WhatPorterDoesProps = {
  title?: string;
  standalone?: boolean;
  items?: { title: string; body: string }[];
};

export function WhatPorterDoes({ title, items, standalone = false }: WhatPorterDoesProps = {}) {
  const [active, setActive] = useState(0);
  return (
    <section className="wpd section" id="what">
      <SectionGradient shape={SHAPES.climb} intensity={0.07} />
      <div className="container wpd__inner">
        <div className="wpd__header">
          <Reveal>
            <MicroLabel>What Porter does</MicroLabel>
          </Reveal>
          <SectionTitle as={standalone ? "h1" : "h2"} text={title ?? "A world-class finance team, working for you."} scrub={false} className="wpd__title" />
          {!items && (
            <Reveal delay={140}>
              <p className="wpd__sub">
                Our team handles the work across six connected areas.
              </p>
            </Reveal>
          )}
        </div>

        {items && (
          <Reveal delay={180}>
            <ul className="wpd__list">
              {items.map((item) => (
                <li key={item.title} className="wpd__item">
                  <h3 className="wpd__item-title">{item.title}</h3>
                  <p className="wpd__item-body">{item.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {!items && <div className="wpd__experience">
          <div className="wpd__selector" aria-label="Explore our finance services">
            {SERVICES.map((service,index) => <Pill variant="ghost" key={service.title} aria-label={`${String(index+1).padStart(2,"0")} ${service.title}`} aria-pressed={active === index} aria-controls="service-description" onClick={() => setActive(index)}>
              <span className="wpd__service-number">{String(index+1).padStart(2,"0")}</span><span>{["Bookkeeping", "Receivables", "Payables", "Payroll", "Taxes", "FP&A"][index]}</span>
            </Pill>)}
          </div>
          <div className="wpd__presentation">
            <div className="wpd__description" id="service-description" aria-live="polite"><h3>{SERVICES[active].title}</h3><p>{SERVICES[active].body}</p></div>
            <figure className="wpd__art" key={active}>
              <picture><source media="(max-width: 600px)" srcSet={`/editorial/service-${active+1}-mobile.svg`} /><img src={`/editorial/service-${active+1}.svg`} width="960" height="380" loading="lazy" alt={[
                "Bank activity is matched to corresponding records in the books.",
                "Completed work moves to an invoice, then a matched payment.",
                "A vendor payment is scheduled on a calendar after approval.",
                "Gross pay is split into net pay and withholding, connected to the books.",
                "Closed books and organized records move through tax review and filing.",
                "Two forecasts compare cash under the current plan and a hiring scenario."
              ][active]} /></picture>
              <figcaption>Illustrative example</figcaption>
            </figure>
          </div>
        </div>}

      </div>
    </section>
  );
}
