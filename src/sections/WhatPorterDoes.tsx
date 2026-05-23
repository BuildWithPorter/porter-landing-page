import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { SectionGradient, SHAPES } from "../components/SectionGradient";
import { PorterAIApp } from "../mockups/PorterAIApp";
import { SERVICES } from "../mockups/PorterAIServices";
import "./WhatPorterDoes.css";

export function WhatPorterDoes() {
  return (
    <section className="wpd section" id="what">
      <SectionGradient shape={SHAPES.climb} />
      <div className="container wpd__inner">
        <div className="wpd__header">
          <Reveal>
            <MicroLabel>What Porter does</MicroLabel>
          </Reveal>
          <SectionTitle text="A world-class finance team, working for you." className="wpd__title" />
          <Reveal delay={140}>
            <p className="wpd__sub">
              Porter's AI finance agents do most of the work, humans verify and approve. Nothing gets posted without explicit human approval.
            </p>
          </Reveal>
        </div>

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
                <span className="material-symbols-outlined wpd__mobile-icon" aria-hidden="true">{s.icon}</span>
                <div className="wpd__mobile-title">{s.title}</div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
