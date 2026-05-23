import { useScrollScrub } from "../hooks/useScrollScrub";
import "./SectionTitle.css";

// Canonical section title — same typography across every section so the page
// reads as one continuous voice. Default behavior is the word-by-word scroll
// scrub used in Pain (the "gold standard" the rest of the page should match).
// Pass `scrub={false}` to render static (e.g. final CTA where the title is
// already centered in the viewport and doesn't need a reveal).

type Props = {
  /** The title copy. Plain string so we can split by word. */
  text: string;
  as?: "h1" | "h2" | "h3";
  /** Defaults to true — word-by-word reveal on scroll. */
  scrub?: boolean;
  className?: string;
};

export function SectionTitle({ text, as: As = "h2", scrub = true, className }: Props) {
  const { ref, progress } = useScrollScrub<HTMLHeadingElement>();
  const words = text.split(" ");
  const cls = `section-title ${className ?? ""}`.trim();

  if (!scrub) {
    return <As className={cls}>{text}</As>;
  }

  return (
    <As ref={ref} className={cls}>
      {words.map((w, i) => {
        const wp = Math.max(0, Math.min(1, progress * words.length - i));
        return (
          <span key={i}>
            <span
              className="section-title__word"
              style={{
                opacity: 0.18 + wp * 0.82,
                color: `color-mix(in oklab, var(--ink-muted) ${(1 - wp) * 100}%, var(--ink) ${wp * 100}%)`,
              }}
            >
              {w}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </As>
  );
}
