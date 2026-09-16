/* Financial health audit introduction, extracted from the page by POR-2226. This
   is the first thing an ad click lands on and the copy here is measured -- read
   the two Reason comments inside before rewording anything. */

import { useEffect } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { HairlineCard } from "../../primitives/HairlineCard";
import { trackFinancialHealthAudit as track } from "../../pages/useFinancialHealthAuditController";

export function AuditIntroduction({ onStart, titleRef, ready }: {
  onStart: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  ready: boolean;
}) {
  useEffect(() => {
    // Reason: Introduction views are distinct from email-gate abandonment and
    // audit creation. Wait for hydration to distinguish new visitors from
    // returning sessions receiving the same prerendered HTML.
    if (!ready) return;
    track("financial_health_audit_introduction_viewed");
  }, [ready]);

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
        <button type="button" className="fha-button fha-button--primary" onClick={onStart}>
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
    </div>
  );
}
