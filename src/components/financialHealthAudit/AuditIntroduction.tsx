/* Financial health audit introduction, extracted from the page by POR-2226. This
   is the first thing an ad click lands on and the copy here is measured -- read
   the two Reason comments inside before rewording anything. */

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { HairlineCard } from "../../primitives/HairlineCard";
import { trackFinancialHealthAudit as track } from "../../pages/useFinancialHealthAuditController";

export function AuditIntroduction({ onStart, titleRef, ready }: {
  onStart: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  ready: boolean;
}) {
  const heroCtaRef = useRef<HTMLButtonElement | null>(null);
  const [heroCtaOnScreen, setHeroCtaOnScreen] = useState(true);

  useEffect(() => {
    // Reason: Introduction views are distinct from email-gate abandonment and
    // audit creation. Wait for hydration to distinguish new visitors from
    // returning sessions receiving the same prerendered HTML.
    if (!ready) return;
    track("financial_health_audit_introduction_viewed");
  }, [ready]);

  useEffect(() => {
    // Reason (POR-2934): Keep the action reachable for the whole scroll, not just
    // in the hero. This is NOT a below-the-fold fix -- measured on production
    // 2026-09-16, the hero button's bottom edge sits at 610px on both a 375x812
    // and a 375x667 viewport, so it is on the first screen either way. The leak
    // is that people read past it: 23 people reached this page that day and 5
    // pressed the button, with a median scroll of 45% of a 1939px page and 14 of
    // 19 sessions lasting over 10s. They engage, scroll, and then have nothing
    // to press. Observe the real hero button rather than a scroll threshold so
    // the bar tracks the button's actual position at any viewport or font size.
    // Bail out where IntersectionObserver is missing: the fallback is the hero
    // button alone, never a bar pinned over the page from first paint.
    const node = heroCtaRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroCtaOnScreen(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fha-introduction">
      <section className="fha-introduction__hero" aria-labelledby="fha-introduction-title">
        <p className="fha-lead-gate__eyebrow">Free financial health audit</p>
        <h1 id="fha-introduction-title" ref={titleRef} tabIndex={-1}>
          Know where your business stands. And what to do next.
        </h1>
        <p className="fha-introduction__lede">
          Your bank balance only tells part of the story. Get a clearer picture of
          your cash, profit, and the loose ends in your books, with practical next
          steps you can act on.
        </p>
        {/* Reason: The ads that bring people here promise a short exercise that
            leaves their books alone, then this page opened with a general pitch
            and never repeated either. Visitors were being asked for an email
            before the page said what the audit costs them in time or does to
            their records. Keep these three above the button: they are the
            objections that stop someone starting, and below the fold is too
            late. "Only reads" describes Porter's behaviour, which is true --
            the audit sync never posts. Do not upgrade it to "read-only
            connection": the QuickBooks permission Porter requests
            (com.intuit.quickbooks.accounting) grants write as well, and that is
            what the visitor's consent screen shows. */}
        <ul className="fha-introduction__assurances">
          <li><MaterialIcon name="schedule" />About three minutes</li>
          <li><MaterialIcon name="lock" />Porter only reads your information. Nothing in your books changes.</li>
          <li><MaterialIcon name="compare_arrows" />Use QuickBooks, upload documents, or just answer questions</li>
        </ul>
        {/* Reason (POR-2899): This button said "Start my free audit", which names
            the process instead of the payoff, and "audit" is the accountant's
            word for the artifact -- to an owner it reads as the IRS, being
            examined, and being judged for messy books. Measured 2026-09-15 over
            30 days on the production landing hosts: 1,621 people viewed this
            page, 1,190 reached the email gate, 4 captured an email, one of whom
            was an internal verification run. The wording here is first person
            and completes the H1 ("Know where your business stands") so the click
            reads as getting the answer rather than starting a chore. Do not
            revert this to process language ("Start", "Begin", "Run my audit")
            without evidence -- that is the exact framing being tested against.
            The product is still named "audit" in the route and in every live
            Meta ad; renaming it here alone would break ad-to-page message match,
            so that rename is deliberately a separate, coordinated change. */}
        <button ref={heroCtaRef} type="button" className="fha-button fha-button--primary" onClick={onStart}>
          Show me where I stand
          <MaterialIcon name="arrow_forward" />
        </button>
        <p className="fha-introduction__note">Free. No account or password needed.</p>
      </section>

      <HairlineCard className="fha-introduction__report">
        <p className="fha-lead-gate__eyebrow">Your report</p>
        <h2>A clearer picture. A practical plan.</h2>
        <ul>
          <li><MaterialIcon name="check" /><div><h3>What needs your attention</h3><p>Findings explained in plain language, grounded in the information you share.</p></div></li>
          <li><MaterialIcon name="check" /><div><h3>What to do next</h3><p>Priorities for this week and this quarter, so you know where to start.</p></div></li>
          <li><MaterialIcon name="check" /><div><h3>Where you need more clarity</h3><p>Understand what your numbers can tell you and where more information is needed.</p></div></li>
        </ul>
      </HairlineCard>

      <section className="fha-introduction__coverage" aria-label="What the audit covers">
        <div><h2>Cash and breathing room</h2><p>Understand how much room you have to cover bills and make your next move.</p></div>
        <div><h2>Profit and spending</h2><p>See how your business makes and spends money, and what deserves a closer look.</p></div>
        <div><h2>Payments and your books</h2><p>Spot unpaid balances and gaps in your records that could cloud your decisions.</p></div>
      </section>

      <section className="fha-introduction__how" aria-labelledby="fha-how-title">
        <h2 id="fha-how-title">How it works</h2>
        <ol>
          {/* Reason: This step used to read "Save your place / Enter your email so
              your audit is easy to return to." A visitor who has just arrived has
              made no progress to save, so it asked for an email and offered
              nothing back. Name what the email is actually for. */}
          <li><h3>Tell us where to send it</h3><p>Your email, so your findings are yours to keep and easy to return to.</p></li>
          <li><h3>Share your financial picture</h3><p>Connect QuickBooks, upload financial documents, or answer a few questions.</p></li>
          <li><h3>Get your findings</h3><p>Review your financial health and the next steps that matter for your business.</p></li>
        </ol>
      </section>

      {/* Reason (POR-2934): Same label and same onStart as the hero button on
          purpose -- introduction_continued and the audit-start path stay single
          sourced, so this bar can never drift from the real CTA or double-count.
          It is rendered always and revealed with CSS rather than mounted on
          scroll, so the transition has something to animate from. aria-hidden
          and tabIndex -1 while the hero button is on screen stop screen readers
          and keyboard users meeting the same action twice. */}
      <div
        className={`fha-introduction__sticky-cta${heroCtaOnScreen ? "" : " is-visible"}`}
        aria-hidden={heroCtaOnScreen}
      >
        <button
          type="button"
          className="fha-button fha-button--primary"
          onClick={onStart}
          tabIndex={heroCtaOnScreen ? -1 : 0}
        >
          Show me where I stand
          <MaterialIcon name="arrow_forward" />
        </button>
      </div>
    </div>
  );
}
