import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import "./WhatPorterDoes.css";

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
                Your books, invoices, bills and payroll, handled by Porter. A finance team that knows your business, with everything in one place.
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
          {[
            ["Books, kept current.", "Your transactions, month end and reporting, handled. Ask a question and get an answer you can use."],
            ["Money you're owed.", "Invoices, payment matching and follow-ups. Keep the work you've done connected to the money coming in."],
            ["Bills and payroll.", "Keep track of what needs paying and what it means for cash. Your finance team handles the details."],
            ["A view of what's next.", "Understand what changed, look ahead at cash, and see what a decision does to your plan."]
          ].map(([title,body],index) => <li className="wpd__item" key={title}><MicroLabel>{String(index+1).padStart(2,"0")}</MicroLabel><h3 className="wpd__item-title">{title}</h3><p className="wpd__item-body">{body}</p></li>)}
        </ul>}
      </div>
    </section>
  );
}
