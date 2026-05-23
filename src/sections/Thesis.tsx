import { useScrollScrub } from "../hooks/useScrollScrub";
import "./Thesis.css";

const HEADLINE = "Finance is just the story of how your business makes and spends money.";

export function Thesis() {
  const { ref, progress } = useScrollScrub<HTMLDivElement>();
  const words = HEADLINE.split(" ");
  return (
    <section className="thesis">
      <div className="container">
        <div ref={ref} className="thesis__inner">
          <h2 className="thesis__line">
            {words.map((w, i) => {
              const wordProgress = Math.max(0, Math.min(1, progress * words.length - i));
              return (
                <span key={i}>
                  <span
                    className="thesis__word"
                    style={{
                      opacity: 0.18 + wordProgress * 0.82,
                      color: `color-mix(in oklab, var(--ink-muted) ${(1 - wordProgress) * 100}%, var(--ink) ${wordProgress * 100}%)`,
                    }}
                  >
                    {w}
                  </span>
                  {i < words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </h2>
          <p className="thesis__body">
            Somewhere along the way it became a compliance headache: software you cannot use, bookkeepers who do not know you, reports that arrive late and tell you nothing. Porter changes that. We make your finances something you actually understand and use to run the business.
          </p>
        </div>
      </div>
    </section>
  );
}
