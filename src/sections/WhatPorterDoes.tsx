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
  return (
    <section className="wpd section" id="what">
      <SectionGradient shape={SHAPES.climb} />
      <div className="container wpd__inner">
        <div className="wpd__header">
          <Reveal>
            <MicroLabel>What Porter does</MicroLabel>
          </Reveal>
          <SectionTitle text={title ?? "A world-class finance team, working for you."} className="wpd__title" />
          {/* Reason: the homepage sub says "AI finance agents", which the site's
              copy rules forbid; industry pages omit it rather than inherit it. */}
          {!items && (
            <Reveal delay={140}>
              <p className="wpd__sub">
                Porter is a managed finance service, supported by our own accounting software. Your team handles the work across six connected areas.
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

        {!items && <ul className="wpd__list wpd__list--home">
          {SERVICES.map(({title,body},index) => <li className="wpd__item" key={title}><MicroLabel>{String(index+1).padStart(2,"0")}</MicroLabel><h3 className="wpd__item-title">{title}</h3><p className="wpd__item-body">{body}</p></li>)}
        </ul>}
      </div>
    </section>
  );
}
