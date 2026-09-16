/* Financial health audit findings carousel, extracted from the page by POR-2226.
   Every slide is mounted; the active one is chosen by translating the track, so
   aria-hidden is what keeps the inactive slides out of the accessibility tree.
   Do not swap this for conditional rendering without re-checking the CSS -- the
   transform animation depends on the siblings existing. */

import { useState } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { findingKicker, renderNumericCopy } from "./reportCopy";
import {
  findingTone,
  findingVerdictLabel,
  type EditorialFindingSlide,
} from "./editorialReportContract";

export function EditorialFindingCarousel({
  slides,
  sectionId,
  eyebrow,
  title,
  className = "",
}: {
  slides: EditorialFindingSlide[];
  sectionId: string;
  eyebrow: string;
  title: string;
  className?: string;
}) {
  const [activeFinding, setActiveFinding] = useState(0);
  const safeActiveFinding = Math.min(activeFinding, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeActiveFinding];
  const titleId = `${sectionId}-title`;

  if (!currentSlide) return null;

  return (
    <section
      id={sectionId}
      className={`fha-editorial-findings${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
    >
      <div className="fha-editorial-container">
        <div className="fha-editorial-section-head">
          <div>
            <p className="fha-editorial-section-mark">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <nav className="fha-editorial-finding-nav" aria-label={`${title} carousel`}>
            <p>
              {String(safeActiveFinding + 1).padStart(2, "0")} of {String(slides.length).padStart(2, "0")}
            </p>
            <div className="fha-editorial-finding-nav__arrows">
              <button
                type="button"
                aria-label={`Previous ${title.toLocaleLowerCase()}`}
                onClick={() => setActiveFinding((current) => (current - 1 + slides.length) % slides.length)}
              >
                <MaterialIcon name="arrow_back" />
              </button>
              <button
                type="button"
                aria-label={`Next ${title.toLocaleLowerCase()}`}
                onClick={() => setActiveFinding((current) => (current + 1) % slides.length)}
              >
                <MaterialIcon name="arrow_forward" />
              </button>
            </div>
          </nav>
        </div>
        <div className="fha-editorial-finding-stage" aria-live="polite">
          <div
            className="fha-editorial-finding-track"
            style={{
              transform: `translate3d(calc(-${safeActiveFinding} * (var(--finding-card) + var(--finding-gap))), 0, 0)`,
            }}
          >
            {slides.map((slide, index) => {
              const kicker = findingKicker(slide.index, slide.finding.checkId, slide.finding.tiedTo);
              const tone = findingTone(slide.finding);
              const verdictLabel = findingVerdictLabel(slide.finding.verdict);
              return (
                <article
                  key={slide.key}
                  className={`fha-editorial-finding-slide is-finding is-${tone}`}
                  aria-hidden={index !== safeActiveFinding}
                >
                  <header>
                    <span>{kicker}</span>
                    {verdictLabel ? (
                      <span className={`fha-editorial-severity is-${tone}`}>
                        {verdictLabel}
                      </span>
                    ) : null}
                  </header>
                  <strong>{renderNumericCopy(slide.finding.stat)}</strong>
                  <h3>{slide.finding.title}</h3>
                  <p>{renderNumericCopy(slide.finding.body)}</p>
                  <div className="fha-editorial-finding-fix">
                    <span>What fixing this takes</span>
                    {/* Reason: The saved recommendation owns its scope; appending a service promise added claims the evidence never established. */}
                    <p>{renderNumericCopy(slide.finding.fixNote)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
