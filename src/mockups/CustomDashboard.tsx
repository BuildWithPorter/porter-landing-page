import "./CustomDashboard.css";

/* Custom dashboard mock — built around the operator, not the accountant.
   Six widgets the user picked: MRR, Runway, AR aging, Top vendors,
   Subscription waste, Investor update draft. */

export function CustomDashboard() {
  return (
    <div className="cdb">
      <header className="cdb__topbar">
        <div className="cdb__brand">
          <span className="cdb__brand-mark"><img src="/porter-icon.svg" alt="" /></span>
          <span>Acme Inc.</span>
        </div>
        <div className="cdb__crumbs">My dashboard  ·  Custom view</div>
        <button className="cdb__add" type="button">+ Add widget</button>
      </header>

      <div className="cdb__grid">
        {/* MRR — line spark */}
        <div className="cdb__tile cdb__tile--mrr">
          <div className="cdb__tile-label">MRR</div>
          <div className="cdb__tile-value">$284K</div>
          <div className="cdb__tile-delta is-pos">+12% MoM  ·  +44% YoY</div>
          <svg className="cdb__spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 0 32 L 18 30 L 36 28 L 54 26 L 72 22 L 90 20 L 108 18 L 126 15 L 144 12 L 162 10 L 180 7 L 200 4" stroke="var(--green)" strokeWidth="2" fill="none" />
            <path d="M 0 32 L 18 30 L 36 28 L 54 26 L 72 22 L 90 20 L 108 18 L 126 15 L 144 12 L 162 10 L 180 7 L 200 4 L 200 40 L 0 40 Z" fill="var(--green)" fillOpacity="0.12" />
          </svg>
        </div>

        {/* Runway — gauge */}
        <div className="cdb__tile cdb__tile--runway">
          <div className="cdb__tile-label">Runway</div>
          <div className="cdb__tile-value">14.2 mo</div>
          <div className="cdb__tile-delta is-pos">At $108K monthly burn</div>
          <div className="cdb__gauge">
            <div className="cdb__gauge-track" />
            <div className="cdb__gauge-fill" />
            <div className="cdb__gauge-marker" />
            <div className="cdb__gauge-labels">
              <span>0</span><span>6</span><span>12</span><span>18</span><span>24+</span>
            </div>
          </div>
        </div>

        {/* AR aging — waterfall */}
        <div className="cdb__tile cdb__tile--ar">
          <div className="cdb__tile-label">AR aging</div>
          <div className="cdb__tile-value">$172K</div>
          <div className="cdb__tile-delta">Outstanding · 12 customers</div>
          <div className="cdb__bars">
            <div><span style={{ height: "78%" }} /><em>$84K</em><i>Current</i></div>
            <div><span style={{ height: "52%" }} /><em>$53K</em><i>1–30</i></div>
            <div><span style={{ height: "28%" }} className="is-amber" /><em>$24K</em><i>31–60</i></div>
            <div><span style={{ height: "12%" }} className="is-amber" /><em>$11K</em><i>61+</i></div>
          </div>
        </div>

        {/* Top vendors */}
        <div className="cdb__tile cdb__tile--vendors">
          <div className="cdb__tile-label">Top vendors · this month</div>
          <ul className="cdb__vendors">
            <li><span>AWS</span><strong>$24,400</strong></li>
            <li><span>Brex Travel</span><strong>$8,180</strong></li>
            <li><span>Carta</span><strong>$3,150</strong></li>
            <li><span>DataDog</span><strong>$2,080</strong></li>
            <li><span>Notion</span><strong>$1,690</strong></li>
          </ul>
        </div>

        {/* SaaS waste */}
        <div className="cdb__tile cdb__tile--waste">
          <div className="cdb__tile-label">SaaS waste flagged</div>
          <div className="cdb__tile-value">$1,840<small>/mo</small></div>
          <div className="cdb__tile-delta is-amber">3 unused tools across the team</div>
          <ul className="cdb__waste">
            <li>Salesforce Sandbox<i>$840</i></li>
            <li>Loom Business<i>$640</i></li>
            <li>Webflow Site Plan<i>$360</i></li>
          </ul>
        </div>

        {/* Investor update draft */}
        <div className="cdb__tile cdb__tile--update">
          <div className="cdb__tile-label">Investor update · April</div>
          <div className="cdb__tile-value cdb__tile-value--md">Draft ready</div>
          <p className="cdb__update-prev">
            “Revenue grew 12% MoM to $284K. Cash position holds at $1.4M with 14 months of runway. Marketing pulled back to baseline after the March trade show…”
          </p>
          <div className="cdb__update-actions">
            <span className="cdb__chip">Review</span>
            <span className="cdb__chip is-quiet">Send to investors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
