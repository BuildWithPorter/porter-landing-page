import { useEffect, useState } from "react";
import "./illustrations.css";

// "I dread looking at my books." — a cluttered chart of accounts with
// accountant jargon and cryptic codes. One row pulses red when the card
// is active. When inactive, the illustration sits in a calm static state.
export function PainBooks({ active = true }: { active?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 1400);
    return () => window.clearInterval(id);
  }, [active]);

  const rows = [
    { code: "1005-100", name: "CASH - OPERATING (DR)", val: "247,810.00" },
    { code: "1200-040", name: "A/R - TRADE (DR)", val: "84,200.00" },
    { code: "2010-200", name: "A/P - VENDORS (CR)", val: "(31,440.50)" },
    { code: "4100-001", name: "REV - RECOG ASC 606", val: "112,400.00" },
    { code: "5200-010", name: "COGS - DR / ACCRUAL", val: "(74,820.00)" },
    { code: "6310-220", name: "OPEX - SG&A - MISC", val: "(8,114.62)" },
  ];

  // When inactive, the "flagged" row is a fixed one rather than rotating.
  const flaggedIndex = active ? (tick + 2) % rows.length : 2;

  return (
    <div className="illu illu--books" aria-hidden="true">
      <div className="illu__head">
        <span className="illu__head-label">chart of accounts</span>
        <span className="illu__head-meta">FY-26 · Q2</span>
      </div>
      <div className="illu__rows">
        {rows.map((r, i) => (
          <div key={r.code} className={`illu__row ${i === flaggedIndex ? "is-flagged" : ""}`}>
            <span className="illu__code">{r.code}</span>
            <span className="illu__name">{r.name}</span>
            <span className="illu__val">{r.val}</span>
          </div>
        ))}
      </div>
      <button type="button" className="illu__launcher" tabIndex={-1} aria-hidden="true">
        <img src="/porter-icon.svg" alt="" />
      </button>
    </div>
  );
}
