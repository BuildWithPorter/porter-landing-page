import { Pill } from "../primitives/Pill";
import { MicroLabel } from "../primitives/MicroLabel";
import { Reveal } from "../primitives/Reveal";
import "./PricingTeaser.css";

export function PricingTeaser() {
  return (
    <section className="pricing section" id="pricing">
      <div className="container pricing__inner">
        <Reveal>
          <MicroLabel>Pricing</MicroLabel>
          <h2 className="pricing__title">
            An enterprise-grade finance team, without the enterprise price tag.
          </h2>
          <p className="pricing__body">
            Plans scale with your business, from founders who want clean books and clear numbers, to teams that want their entire finance function run for them.
          </p>
          <div className="pricing__cta">
            <Pill href="#cta" variant="primary" size="lg">Talk to us about your finance team</Pill>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
