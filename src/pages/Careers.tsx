import { useEffect } from "react";
import { LegalLayout } from "./LegalLayout";
import "./Careers.css";

// Gem-hosted job board embed. Three things have to happen in order:
//   1. Set window.__gemJobBoardUrl BEFORE the script loads (the script reads
//      this global on init).
//   2. Inject the embed script.
//   3. Render the target div; the script hydrates into it.
// The useEffect does (1) and (2) on mount and removes the script on unmount.
//
// NOTE: Gem's embed snippet supports two modes. With `data-gem-jid="<jobId>"`
// it embeds the full detail page of a single job. Without that attribute it
// embeds the board listing (the clean "Open positions" list with one row per
// role, each linking through to its detail). We want the board listing here.
const JOB_BOARD_URL = "https://jobs.gem.com/buildwithporter-com";
const EMBED_SRC = "https://jobs.gem.com/gem/embed";

export function Careers() {
  useEffect(() => {
    (window as unknown as { __gemJobBoardUrl?: string }).__gemJobBoardUrl = JOB_BOARD_URL;

    const script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.parentNode?.removeChild(script);
    };
  }, []);

  return (
    <LegalLayout
      eyebrow="Careers"
      title="Join the Porter team."
      intro={
        <>
          We&rsquo;re building AI finance teams for startups and SMBs. If that
          sounds like something you want to work on, we&rsquo;d love to hear
          from you.
        </>
      }
    >
      <div className="careers__board-label">Open positions</div>
      <div className="careers__board">
        <div id="gem_job_board_embed" />
      </div>
      <div className="careers__board-foot">
        <span>Listings powered by Gem.</span>
        <a href={JOB_BOARD_URL} target="_blank" rel="noopener noreferrer">
          View full board ↗
        </a>
      </div>
    </LegalLayout>
  );
}
