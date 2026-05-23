import type { ReactNode } from "react";
import "./LegalLayout.css";

type Props = {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  children: ReactNode;
};

/** Shared chrome for /privacy-policy and /terms-of-service — sticky nav with
 *  the proper Porter mark + back-to-home pill, eyebrow, big serif title,
 *  long-form content area in the canonical typography. */
export function LegalLayout({ title, lastUpdated, intro, children }: Props) {
  return (
    <div className="legal">
      <header className="legal__nav">
        <div className="legal__nav-inner container">
          <a className="legal__brand" href="/" aria-label="Porter home">
            <img src="/porter-logo-dark.svg" alt="Porter" />
          </a>
          <a className="legal__back" href="/">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Back to home
          </a>
        </div>
      </header>

      <main className="legal__main container">
        <div className="legal__eyebrow">Legal</div>
        <h1 className="legal__title">{title}</h1>
        <div className="legal__updated">Last updated · {lastUpdated}</div>

        <p className="legal__intro">{intro}</p>

        <div className="legal__body">{children}</div>
      </main>
    </div>
  );
}

/* ── Reusable atoms used inside legal page bodies ────────────────────── */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal__section">
      <h2 className="legal__h2">{title}</h2>
      {children}
    </section>
  );
}

export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal__sub">
      <h3 className="legal__h3">{title}</h3>
      {children}
    </div>
  );
}

export function Important({ children }: { children: ReactNode }) {
  return <div className="legal__important">{children}</div>;
}

export function Contact({ children }: { children: ReactNode }) {
  return <div className="legal__contact">{children}</div>;
}

export function Footnote({ children }: { children: ReactNode }) {
  return (
    <>
      <hr className="legal__rule" />
      <p className="legal__footnote">{children}</p>
    </>
  );
}
