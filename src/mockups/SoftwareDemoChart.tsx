import { useEffect, useState } from "react";
import "./PorterAIApp.css";
import "./SoftwareDemoChart.css";

// Sidebar layout matches PorterAIApp (collapsed, dark) — repeated here so
// this demo can stand alone without depending on the suggestion-grid version.
const SIDEBAR_ITEMS = [
  { icon: "auto_awesome", active: true },
  { icon: "grid_view" },
  { icon: "table_chart" },
  { icon: "calendar_today" },
  { icon: "task_alt" },
  { icon: "description" },
  { icon: "bar_chart" },
];
const SIDEBAR_SETTINGS = [{ icon: "search" }, { icon: "memory" }, { icon: "settings" }];

// ── OpEx LTM data, $000s. March '26 has a clear spike. ──────────────────
type Row = { month: string; salaries: number; software: number; marketing: number; ga: number };

const DATA: Row[] = [
  { month: "May '25", salaries: 124, software: 22, marketing: 18, ga: 12 },
  { month: "Jun",     salaries: 128, software: 23, marketing: 19, ga: 12 },
  { month: "Jul",     salaries: 131, software: 24, marketing: 21, ga: 13 },
  { month: "Aug",     salaries: 134, software: 25, marketing: 20, ga: 13 },
  { month: "Sep",     salaries: 136, software: 26, marketing: 22, ga: 14 },
  { month: "Oct",     salaries: 138, software: 27, marketing: 24, ga: 14 },
  { month: "Nov",     salaries: 140, software: 27, marketing: 23, ga: 15 },
  { month: "Dec",     salaries: 142, software: 28, marketing: 25, ga: 15 },
  { month: "Jan '26", salaries: 144, software: 28, marketing: 22, ga: 16 },
  { month: "Feb",     salaries: 146, software: 29, marketing: 24, ga: 16 },
  { month: "Mar",     salaries: 148, software: 30, marketing: 96, ga: 17 }, // spike (trade show)
  { month: "Apr",     salaries: 150, software: 31, marketing: 26, ga: 17 },
];

// Per BIBLE §II.7 (Color encodes meaning. Period.) and §III:
// charts default to the monochrome green ramp, but break to bicolor when
// a true signal demands it. Here that signal is the March marketing spike
// (one-time trade show) — so Marketing carries the warning amber while
// the recurring categories sit on the muted green/ink ramp. The
// dark-appearance shifts: green stays #5FB893/#95D4B3, ink-muted #707973
// becomes #9EA79F, warning amber #92400E softens to #D6A56F.
const SERIES = [
  { key: "salaries" as const,  label: "Salaries & Benefits",  color: "#5FB893" }, // green-deep — anchor (biggest, recurring)
  { key: "software" as const,  label: "Software & Tools",     color: "#95D4B3" }, // green — recurring SaaS spend
  { key: "marketing" as const, label: "Marketing & Sales",    color: "#D6A56F" }, // warning amber — the March outlier
  { key: "ga" as const,        label: "G&A",                  color: "#707973" }, // muted gray — the quiet base
];

const fmtK = (n: number) => `$${n.toLocaleString("en-US")}K`;

function totalOf(r: Row) {
  return r.salaries + r.software + r.marketing + r.ga;
}

const Q1 = "Show me the LTM trend of my operating expenses, broken out by expense type, month by month as a column chart.";
const Q2 = "Why did OpEx spike in March 2026?";

export function SoftwareDemoChart() {
  // Step 0=greeting, 1=Q1 typing, 2=Q1 shown + AI head, 3=AI intro1, 4=chart drawing, 5=chart done,
  //      6=Q2 typing, 7=Q2 shown + AI head 2, 8=AI intro2, 9=insights
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) {
      setStep(9);
      setHoverIndex(10); // pre-show the spike tooltip in reduced mode
      return;
    }
    setStep(0);
    setHoverIndex(null);
    const schedule: Array<[number, number]> = [
      [600, 1],
      [1400, 2],
      [2200, 3],
      [3000, 4],
      [4600, 5],
      [5800, 6],
      [6800, 7],
      [7600, 8],
      [8400, 9],
    ];
    const timers = schedule.map(([t, s]) => window.setTimeout(() => setStep(s), t));
    // Auto-highlight the March spike after the chart settles so users see the tooltip.
    const hoverIn = window.setTimeout(() => setHoverIndex(10), 5200);
    const hoverOut = window.setTimeout(() => setHoverIndex(null), 7800);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(hoverIn);
      window.clearTimeout(hoverOut);
    };
  }, [reduced]);

  return (
    <div className="pa pa--demo">
      {/* Sidebar */}
      <aside className="pa__sidebar" aria-label="Porter app navigation">
        <div className="pa__sidebar-brand"><img src="/porter-icon.svg" alt="" /></div>
        <nav className="pa__sidebar-nav">
          {SIDEBAR_ITEMS.map((it, i) => (
            <div key={i} className={`pa__sidebar-row ${it.active ? "is-active" : ""}`}>
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>
        <div className="pa__sidebar-divider" />
        <nav className="pa__sidebar-nav">
          {SIDEBAR_SETTINGS.map((it, i) => (
            <div key={i} className="pa__sidebar-row">
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>
        <div className="pa__sidebar-user"><span className="pa__sidebar-avatar">M</span></div>
      </aside>

      {/* Main */}
      <section className="pa__main">
        <header className="pa__topbar">
          <div className="pa__topbar-left">
            <span className="material-symbols-outlined pa__topbar-icon">menu</span>
            <div className="pa__workspace">
              <span className="pa__workspace-mark">AC</span>
              <span className="pa__workspace-name">Acme Inc.</span>
              <span className="pa__workspace-tag">QBO</span>
              <span className="material-symbols-outlined pa__workspace-chev">expand_more</span>
            </div>
          </div>
          <div className="pa__search">
            <span className="material-symbols-outlined pa__search-icon">search</span>
            <span className="pa__search-placeholder">Search transactions...</span>
          </div>
          <div className="pa__topbar-right">
            <div className="pa__toggle">
              <span className="pa__toggle-dot" />
              <span className="pa__toggle-label">Ask before acting</span>
            </div>
            <button className="pa__new-chat" type="button">
              <span className="material-symbols-outlined">add</span>
              New chat
            </button>
            <button className="pa__history" type="button">
              <span className="material-symbols-outlined">history</span>
              History
            </button>
          </div>
        </header>

        <div className="pa__body">
          <div className="sdc">
            {step === 0 && (
              <div className="sdc__greeting">
                <h2 className="sdc__greeting-line">What can I help you with today?</h2>
              </div>
            )}

            {step >= 1 && (
              <div className="sdc__scroll">
                {/* First exchange */}
                <div className="pa__user">
                  <div className="pa__user-bubble">{Q1}</div>
                </div>

                {step >= 2 && (
                  <div className="pa__ai">
                    <div className="pa__ai-head pa__fade">
                      <span className="pa__ai-mark"><img src="/porter-icon.svg" alt="" /></span>
                      <span className="pa__ai-name">Porter</span>
                      <span className="pa__ai-tag">finance copilot</span>
                    </div>

                    {step >= 3 && (
                      <div className="pa__ai-section pa__fade">
                        <p className="pa__ai-intro">
                          Here's the last twelve months of operating expenses, stacked by category. Total OpEx is up <strong>~12% year over year</strong>, with one outlier in March.
                        </p>
                      </div>
                    )}

                    {step >= 4 && (
                      <div className="pa__ai-section pa__fade">
                        <OpExChart
                          drawn={step >= 5 || reduced}
                          hoverIndex={hoverIndex}
                          onHover={setHoverIndex}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Second exchange */}
                {step >= 6 && (
                  <div className="pa__user">
                    <div className="pa__user-bubble">{Q2}</div>
                  </div>
                )}

                {step >= 7 && (
                  <div className="pa__ai">
                    <div className="pa__ai-head pa__fade">
                      <span className="pa__ai-mark"><img src="/porter-icon.svg" alt="" /></span>
                      <span className="pa__ai-name">Porter</span>
                      <span className="pa__ai-tag">finance copilot</span>
                    </div>

                    {step >= 8 && (
                      <div className="pa__ai-section pa__fade">
                        <p className="pa__ai-intro">
                          Marketing & Sales spend jumped from <strong>$24K → $96K</strong> in March. The driver was a one-time trade show — South by South, Austin.
                        </p>
                      </div>
                    )}

                    {step >= 9 && (
                      <div className="pa__ai-section pa__fade">
                        <InsightBreakdown />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pa__composer">
            <input
              className="pa__composer-input"
              placeholder="Ask anything..."
              readOnly
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="pa__composer-actions">
              <span className="material-symbols-outlined pa__composer-icon">attach_file</span>
              <span className="pa__composer-send">
                <span className="material-symbols-outlined">arrow_upward</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────── Chart ───────── */

function OpExChart({
  drawn,
  hoverIndex,
  onHover,
}: {
  drawn: boolean;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
}) {
  const max = Math.max(...DATA.map(totalOf));
  const chartH = 200;
  const labelGap = 28;
  const fullH = chartH + labelGap;

  return (
    <div className="sdc__chart">
      <div className="sdc__chart-head">
        <div className="sdc__chart-title">Operating expenses · LTM · by category</div>
        <div className="sdc__chart-legend">
          {SERIES.map((s) => (
            <div key={s.key} className="sdc__legend-item">
              <span className="sdc__legend-dot" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
      <div className="sdc__chart-canvas" style={{ height: fullH }}>
        {DATA.map((row, i) => {
          const total = totalOf(row);
          const isHover = hoverIndex === i;
          const isSpike = i === 10;
          return (
            <div
              key={row.month}
              className={`sdc__col ${isHover ? "is-hover" : ""} ${isSpike ? "is-spike" : ""}`}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="sdc__col-bar" style={{ height: chartH }}>
                {SERIES.map((s) => {
                  const v = row[s.key];
                  const heightPx = drawn ? (v / max) * chartH : 0;
                  return (
                    <div
                      key={s.key}
                      className="sdc__seg"
                      style={{
                        height: `${heightPx}px`,
                        background: s.color,
                        transition: `height 700ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 40}ms`,
                      }}
                    />
                  );
                })}
                {isHover && (
                  <div className={`sdc__tooltip ${i >= DATA.length - 3 ? "is-flipped" : ""}`}>
                    <div className="sdc__tooltip-head">
                      <span className="sdc__tooltip-month">{row.month}</span>
                      <span className="sdc__tooltip-total">{fmtK(total)}</span>
                    </div>
                    <div className="sdc__tooltip-rows">
                      {SERIES.slice().reverse().map((s) => (
                        <div key={s.key} className="sdc__tooltip-row">
                          <span className="sdc__tooltip-dot" style={{ background: s.color }} />
                          <span className="sdc__tooltip-label">{s.label}</span>
                          <span className="sdc__tooltip-val">{fmtK(row[s.key])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="sdc__col-label">{row.month}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── Insight breakdown (follow-up answer) ───────── */

function InsightBreakdown() {
  const items = [
    { icon: "campaign", label: "Booth + sponsorship", amount: "$48K" },
    { icon: "flight",   label: "Team travel · 6 people", amount: "$32K" },
    { icon: "redeem",   label: "Swag + collateral", amount: "$14K" },
    { icon: "summarize",label: "One-time total", amount: "$94K" },
  ];
  return (
    <div className="sdc__insight">
      <div className="sdc__insight-rows">
        {items.map((it) => (
          <div key={it.label} className={`sdc__insight-row ${it.label === "One-time total" ? "is-total" : ""}`}>
            <span className="material-symbols-outlined sdc__insight-icon">{it.icon}</span>
            <span className="sdc__insight-label">{it.label}</span>
            <span className="sdc__insight-amount">{it.amount}</span>
          </div>
        ))}
      </div>
      <p className="sdc__insight-note">
        Recurring marketing spend resumed in April at $26K. No new vendor commitments outstanding.
      </p>
    </div>
  );
}
