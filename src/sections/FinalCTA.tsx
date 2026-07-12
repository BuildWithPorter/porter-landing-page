import { Pill } from "../primitives/Pill";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { useWaitlist } from "../components/WaitlistDialog";
import "./FinalCTA.css";

export function FinalCTA() {
  const { open } = useWaitlist();
  return (
    <section className="cta" id="cta">
      {/* Quiet eyebrow + secondary chrome → soft luxury "closing card" feel. */}
      <div className="cta__chrome" aria-hidden="true">
        <span className="cta__rule" />
        <span className="cta__eyebrow">Get started</span>
        <span className="cta__rule" />
      </div>

      <div className="container cta__inner">
        <SectionTitle
          text="Finance does not have to be a compliance headache."
          className="cta__title"
          scrub={false}
        />
        <Reveal delay={80}>
          <p className="cta__body">
            Get the finance team your business deserves, at a fraction of the cost.
          </p>
        </Reveal>
        <Reveal delay={140}>
          <div className="cta__buttons">
            <Pill variant="primary" size="lg" onClick={open}>Try Porter</Pill>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
