import type { MouseEventHandler } from "react";
import { Pill } from "../primitives/Pill";
import { SectionTitle } from "../primitives/SectionTitle";
import { Reveal } from "../primitives/Reveal";
import { useWaitlist } from "../components/WaitlistDialog";
import "./FinalCTA.css";

// Reason (POR-3087): industry pages close on the audit, the same destination as
// their hero, instead of the homepage's waitlist dialog, because the audit is
// the conversion the industry campaigns optimise for. Without props the
// homepage copy and waitlist button are unchanged.
type FinalCTAProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  cta?: { label: string; href: string; onClick?: MouseEventHandler<HTMLAnchorElement> };
};

export function FinalCTA({ eyebrow, title, body, cta }: FinalCTAProps = {}) {
  const { open } = useWaitlist();
  return (
    <section className="cta" id="cta">
      {/* Quiet eyebrow + secondary chrome → soft luxury "closing card" feel. */}
      <div className="cta__chrome" aria-hidden="true">
        <span className="cta__rule" />
        <span className="cta__eyebrow">{eyebrow ?? "Get started"}</span>
        <span className="cta__rule" />
      </div>

      <div className="container cta__inner">
        <SectionTitle
          text={title ?? "Your next chapter starts here."}
          className="cta__title"
          scrub={false}
        />
        <Reveal delay={80}>
          <p className="cta__body">
            {body ?? "Tell us about your business. We’ll talk through the services and software that fit, and what getting started would look like."}
          </p>
        </Reveal>
        <Reveal delay={140}>
          <div className="cta__buttons">
            {cta ? (
              <Pill variant="primary" size="lg" href={cta.href} onClick={cta.onClick}>
                {cta.label}
              </Pill>
            ) : (
              <Pill variant="primary" size="lg" onClick={open}>Talk to Porter</Pill>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
