import "./LiveDashboard.css";

/* Live finance dashboard mock — used in the customer deck.
   Continuous-reconciliation hero with four KPI tiles + a 12-month
   revenue/expense overlay chart + "reconciled to bank" footer strip. */

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const REVENUE  = [142, 156, 168, 174, 188, 196, 212, 220, 244, 256, 278, 284];
const EXPENSES = [118, 124, 128, 132, 138, 142, 148, 152, 162, 168, 184, 176];

export function LiveDashboard() {
  const maxV = Math.max(...REVENUE);
  const minV = 0;
  const innerH = 132;
  const innerW = 640;
  const step = innerW / (REVENUE.length - 1);
  const toY = (v: number) => innerH - ((v - minV) / (maxV - minV)) * innerH;

  const linePath = (vals: number[]) => {
    return vals.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  };
  const areaPath = (vals: number[]) => {
    return `${linePath(vals)} L ${innerW} ${innerH} L 0 ${innerH} Z`;
  };

  return (
    <div className="ldb">
      <header className="ldb__topbar">
        <div className="ldb__brand">
          <span className="ldb__brand-mark"><img src="/porter-icon.svg" alt="" /></span>
          <span>Acme Inc.</span>
          <span className="ldb__tag">QBO</span>
        </div>
        <div className="ldb__crumbs">Dashboard  ·  This month</div>
        <div className="ldb__strip">
          <span className="ldb__dot" /> Reconciled to bank  ·  Updated 2 min ago
        </div>
      </header>

      <div className="ldb__kpis">
        <KPI label="Revenue" value="$284,160" delta="+12% MoM" positive />
        <KPI label="Expenses" value="$176,420" delta="−3% MoM" positive />
        <KPI label="Cash on hand" value="$1.4M" delta="3 accounts in sync" neutral />
        <KPI label="Burn rate" value="$108K/mo" delta="14.2 months runway" positive />
      </div>

      <section className="ldb__chart">
        <div className="ldb__chart-head">
          <div>
            <div className="ldb__chart-eyebrow">Operating performance · last twelve months</div>
            <div className="ldb__chart-title">Revenue vs. expenses</div>
          </div>
          <div className="ldb__legend">
            <span className="ldb__legend-key"><i style={{ background: "var(--green)" }} /> Revenue</span>
            <span className="ldb__legend-key"><i style={{ background: "var(--ink-muted)" }} /> Expenses</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${innerW} ${innerH + 28}`} preserveAspectRatio="none" className="ldb__svg">
          <defs>
            <linearGradient id="ldb-rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p, i) => (
            <line key={i} x1={0} x2={innerW} y1={innerH * p} y2={innerH * p} stroke="var(--hair-subtle)" strokeWidth="0.5" />
          ))}
          <path d={areaPath(REVENUE)} fill="url(#ldb-rev)" />
          <path d={linePath(EXPENSES)} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3,3" />
          <path d={linePath(REVENUE)} fill="none" stroke="var(--green)" strokeWidth="2" />
          {REVENUE.map((v, i) => (
            <circle key={i} cx={i * step} cy={toY(v)} r={i === REVENUE.length - 1 ? 4 : 2} fill="var(--green)" />
          ))}
          {MONTHS.map((m, i) => (
            <text key={i} x={i * step} y={innerH + 16} fontSize="8" fill="var(--ink-muted)" textAnchor="middle">{m}</text>
          ))}
        </svg>
      </section>

      <footer className="ldb__foot">
        <span className="ldb__foot-stat"><strong>3</strong> bank accounts</span>
        <span className="ldb__foot-sep">·</span>
        <span className="ldb__foot-stat"><strong>184</strong> transactions categorized today</span>
        <span className="ldb__foot-sep">·</span>
        <span className="ldb__foot-stat"><strong>0</strong> exceptions queued for review</span>
      </footer>
    </div>
  );
}

function KPI({ label, value, delta, positive, neutral }: { label: string; value: string; delta: string; positive?: boolean; neutral?: boolean }) {
  return (
    <div className="ldb__kpi">
      <div className="ldb__kpi-label">{label}</div>
      <div className="ldb__kpi-value">{value}</div>
      <div className={`ldb__kpi-delta ${positive ? "is-pos" : neutral ? "is-neu" : ""}`}>{delta}</div>
    </div>
  );
}
