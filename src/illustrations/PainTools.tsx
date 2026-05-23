import "./illustrations.css";

// "I'd rather spend on growth than finance." — a chaotic stack of
// disconnected finance tools.
// - Active: 3-col rotated/staggered grid, all 8 tools visible.
// - Inactive: clean 2-col list, top 6 tools, no rotation. Reads cleanly
//   at the narrower card width without the squish.
export function PainTools({ active = true }: { active?: boolean }) {
  const tiles = [
    { name: "Bench", sub: "Bookkeeping", cost: "$249 / mo" },
    { name: "Pilot", sub: "Bookkeeping", cost: "$599 / mo" },
    { name: "QuickBooks", sub: "Accounting", cost: "$95 / mo" },
    { name: "Stripe", sub: "Payments", cost: "2.9% + 30¢" },
    { name: "Expensify", sub: "Expenses", cost: "$60 / mo" },
    { name: "Gusto", sub: "Payroll", cost: "$190 / mo" },
    { name: "Ramp", sub: "Cards", cost: "—" },
    { name: "Excel", sub: "The truth", cost: "—" },
  ];

  const visible = active ? tiles : tiles.slice(0, 6);

  return (
    <div className={`illu illu--tools ${active ? "is-active" : "is-static"}`} aria-hidden="true">
      <div className="illu__head">
        <span className="illu__head-label">your finance stack</span>
        <span className="illu__head-meta illu__head-meta--warn">8 tools · $1,193 / mo</span>
      </div>
      <div className="illu__tools-grid">
        {visible.map((t, i) => (
          <div
            key={t.name}
            className="illu__tool"
            style={
              active
                ? {
                    transform: `rotate(${(i - 3) * 1.6}deg) translateY(${(i % 3) * 4}px)`,
                    zIndex: 10 - i,
                  }
                : undefined
            }
          >
            <div className="illu__tool-mark">{t.name.slice(0, 1)}</div>
            <div className="illu__tool-text">
              <div className="illu__tool-name">{t.name}</div>
              <div className="illu__tool-sub">{t.sub}</div>
            </div>
            <div className="illu__tool-cost">{t.cost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
