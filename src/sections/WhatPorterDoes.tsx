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
  items?: { title: string; body: string }[];
};

export function WhatPorterDoes({ title, items }: WhatPorterDoesProps = {}) {
  const [active, setActive] = useState(0);
  return (
    <section className="wpd section" id="what">
      <SectionGradient shape={SHAPES.climb} intensity={0.07} />
      <div className="container wpd__inner">
        <div className="wpd__header">
          <Reveal>
            <MicroLabel>What Porter does</MicroLabel>
          </Reveal>
          <SectionTitle text={title ?? "A world-class finance team, working for you."} scrub={false} className="wpd__title" />
          {/* Reason: the homepage sub says "AI finance agents", which the site's
              copy rules forbid; industry pages omit it rather than inherit it. */}
          {!items && (
            <Reveal delay={140}>
              <p className="wpd__sub">
                Porter is a managed finance service, supported by our own accounting software. Our team handles the work across six connected areas.
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
          <figure className="wpd__art" key={active}>
            <img src={`/services/service-${active+1}.jpg`} width="1440" height="1080" loading="lazy" alt={[
              "Bank activity and general-ledger records connect through matching reconciliation lines.",
              "An invoice moves from completed work to a matched payment, with no balance remaining.",
              "A payment calendar highlights due dates beside a vendor bill awaiting approval.",
              "A payroll hub connects pay, withholding and the payroll journal.",
              "Separate supporting records and tax preparation folders feed a coordinated review process.",
              "Two forecast lines compare an operating plan and a hiring scenario."
            ][active]} />
            <figcaption>Illustrative example</figcaption>
          </figure>
          <div className="wpd__services">
            <div className="wpd__selector" aria-label="Explore our finance services">
              {SERVICES.map((service,index) => <Pill variant="ghost" key={service.title} aria-pressed={active === index} aria-controls="service-description" onClick={() => setActive(index)}>
                <span className="wpd__service-number">{String(index+1).padStart(2,"0")}</span><span>{service.title}</span><span aria-hidden="true">↗</span>
              </Pill>)}
            </div>
            <p id="service-description" className="wpd__description" aria-live="polite">{SERVICES[active].body}</p>
          </div>
        </div>}
      </div>
    </section>
  );
}
