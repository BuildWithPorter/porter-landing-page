import { useEffect, useState } from "react";
import "./illustrations.css";

// "Invoices and bills fall through the cracks." — an AR aging strip
// with rows aging into the red. A counter shows "0 follow-ups sent."
// When inactive, the strip sits at a calm steady aging state.
export function PainInvoices({ active = true }: { active?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, [active]);

  const bump = active ? tick : 3; // calm "settled" state when inactive

  const rows = [
    { name: "Bridgepoint Holdings", days: 12, amount: "$24,500" },
    { name: "Northwind Logistics", days: 28 + Math.min(bump, 6), amount: "$8,940" },
    { name: "Wakefield Co.", days: 47 + Math.min(bump, 6), amount: "$16,800" },
    { name: "Cedar & Vine LLC", days: 63 + Math.min(bump, 6), amount: "$3,275" },
  ];

  const bucket = (d: number) => {
    if (d > 60) return "overdue";
    if (d > 30) return "attention";
    if (d > 14) return "neutral";
    return "ok";
  };

  return (
    <div className="illu illu--invoices" aria-hidden="true">
      <div className="illu__head">
        <span className="illu__head-label">Receivables, aging</span>
        <span className="illu__head-meta">4 open · $53,515</span>
      </div>
      <div className="illu__ar-rows">
        {rows.map((r) => (
          <div key={r.name} className="illu__ar-row">
            <div className="illu__ar-meta">
              <div className="illu__ar-name">{r.name}</div>
              <div className="illu__ar-sub">
                <span className="illu__ar-amount">{r.amount}</span>
                <span className={`illu__ar-days illu__ar-days--${bucket(r.days)}`}>{r.days} days</span>
              </div>
            </div>
            <div className={`illu__ar-bar illu__ar-bar--${bucket(r.days)}`}>
              <div className="illu__ar-bar-fill" style={{ width: `${Math.min(100, (r.days / 75) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="illu__ar-stamp">
        <span className="illu__ar-stamp-num">0</span>
        <span className="illu__ar-stamp-label">follow-ups sent this month</span>
      </div>
    </div>
  );
}
