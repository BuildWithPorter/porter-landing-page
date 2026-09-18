import { MicroLabel } from "../primitives/MicroLabel";
import { MaterialIcon } from "../components/MaterialIcon";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { PorterAIApp } from "../mockups/PorterAIApp";
import { SERVICES } from "../mockups/PorterAIServices";
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
                Porter's AI finance agents do most of the work, humans verify and approve. Nothing gets posted without explicit human approval.
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

        {!items && (
          <>
            <Reveal delay={220}>
              <div className="wpd__mock">
                <div className="wpd__mock-inner">
                  <PorterAIApp />
                </div>
              </div>
            </Reveal>

            {/* Mobile-only stand-in: the AI app mock doesn't read at 390px,
                so we show a clean 2×3 services grid with iconography only.
                The chat-style example questions are dropped — they only made
                sense inside the AI mock context. */}
            <Reveal delay={220}>
              <ul className="wpd__mobile-list" aria-label="Porter services">
                {SERVICES.map((s) => (
                  <li key={s.key} className="wpd__mobile-item">
                    <MaterialIcon name={s.icon} className="wpd__mobile-icon" />
                    <div className="wpd__mobile-title">{s.title}</div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}
