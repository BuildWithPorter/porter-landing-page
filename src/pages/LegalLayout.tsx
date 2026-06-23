import type { ReactNode } from "react";
import { Seo } from "../components/Seo";
import "./LegalLayout.css";

type Props = {
  title: string;
  eyebrow?: string;
  lastUpdated?: string;
  intro: ReactNode;
  children: ReactNode;
  /** Path for canonical URL + sitemap (e.g. "/careers", "/support"). */
  path?: string;
  /** Override the <title> tag (defaults to "<title> · Porter"). */
  seoTitle?: string;
  /** Required if the page is meant to be indexed; supply a real one-liner. */
  seoDescription?: string;
  /** Hide from search engines (e.g. internal /deck). */
  noindex?: boolean;
};

/** Shared chrome for /privacy-policy, /terms-of-service, /slack and /support —
 *  sticky nav with the proper Porter mark + back-to-home pill, eyebrow, big
 *  serif title, long-form content area in the canonical typography. */
export function LegalLayout({
  title,
  eyebrow = "Legal",
  lastUpdated,
  intro,
  children,
  path,
  seoTitle,
  seoDescription,
  noindex,
}: Props) {
  return (
    <div className="legal">
      {path && seoDescription ? (
        <Seo
          title={seoTitle ?? `${title} · Porter`}
          description={seoDescription}
          path={path}
          robots={noindex ? "noindex, nofollow" : undefined}
        />
      ) : null}
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
        <div className="legal__eyebrow">{eyebrow}</div>
        <h1 className="legal__title">{title}</h1>
        {lastUpdated ? (
          <div className="legal__updated">Last updated · {lastUpdated}</div>
        ) : null}

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
