import { useCallback, useEffect, useRef, useState } from "react";
import "./FaqCarousel.css";

/**
 * Editorial FAQ carousel — one card visible at a time, prev/next arrows,
 * small-caps pagination readout "01 / 04". Cards translate horizontally
 * inside a locked-height frame so section flow does not jump between
 * questions of different lengths. Full keyboard support (← → Home End).
 *
 * Matched aesthetic notes for Michael's Hermes editorial redesign:
 *   - Cards live at the article's 640px reading measure so the carousel
 *     sits inside the same measure column as body prose.
 *   - Card: hairline border, subtle recessed background, generous padding.
 *   - Question: italic EB Garamond, size 26px (larger than the old <dt>
 *     to fix Michael's "text too small" complaint).
 *   - Answer: DM Sans 17px, 1.75 line-height — comfortable read length.
 *   - Controls: prev/next arrows + centered pagination "01 / 04" in small
 *     caps letter-spaced. Minimal, editorial. No dot-pagination.
 *
 * NOT used: dot pagination, coverflow, autoplay. Those read as marketing
 * carousel patterns, not editorial.
 */

type Faq = { q: string; a: string };

export function FaqCarousel({ faqs }: { faqs: Faq[] }) {
  const [i, setI] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const n = faqs.length;

  const go = useCallback(
    (nextI: number) => {
      if (n === 0) return;
      setI(((nextI % n) + n) % n);
    },
    [n],
  );

  // Keyboard shortcuts. Only active when the carousel or its children have
  // focus, so the rest of the article scrolls normally with arrows.
  useEffect(() => {
    const el = trackRef.current?.closest(".faq-carousel");
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target as HTMLElement).closest(".faq-carousel")) return;
      if (e.key === "ArrowRight") { go(i + 1); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { go(i - 1); e.preventDefault(); }
      else if (e.key === "Home") { go(0); e.preventDefault(); }
      else if (e.key === "End") { go(n - 1); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, n, go]);

  if (n === 0) return null;

  const pad = (v: number) => String(v).padStart(2, "0");

  return (
    <div
      className="faq-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Common questions carousel"
      tabIndex={0}
    >
      <div className="faq-carousel__frame">
        <div
          ref={trackRef}
          className="faq-carousel__track"
          style={{ transform: `translateX(calc(${-i} * 100%))` }}
        >
          {faqs.map((f, idx) => (
            <article
              key={idx}
              className="faq-carousel__card"
              role="group"
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${n}`}
              aria-hidden={idx !== i}
            >
              <h3 className="faq-carousel__q">
                <span className="faq-carousel__q-num">{pad(idx + 1)}.</span> {f.q}
              </h3>
              <p className="faq-carousel__a">{f.a}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="faq-carousel__controls">
        <button
          type="button"
          className="faq-carousel__arrow"
          aria-label="Previous question"
          onClick={() => go(i - 1)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M15 4L7 12L15 20" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <div className="faq-carousel__readout" aria-live="polite">
          <span className="faq-carousel__readout-current">{pad(i + 1)}</span>
          <span className="faq-carousel__readout-sep">/</span>
          <span className="faq-carousel__readout-total">{pad(n)}</span>
        </div>
        <button
          type="button"
          className="faq-carousel__arrow"
          aria-label="Next question"
          onClick={() => go(i + 1)}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M9 4L17 12L9 20" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
