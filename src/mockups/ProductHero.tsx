import { useEffect, useState } from "react";
import { StatusPill } from "../primitives/StatusPill";
import "./ProductHero.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Dramatic shape: build, peak, slight pullback, recovery, new peak (in thousands).
const REVENUE = [62, 78, 94, 112, 138, 152, 144, 132, 156, 184, 208, 236];
const TOTAL = REVENUE.reduce((s, v) => s + v, 0);

export function ProductHero() {
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((t) => (t + 1) % 6), 1000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const revenue = TOTAL * 1000 + tick * 427;
  const collected = Math.round(revenue * 0.86);
  const outstanding = revenue - collected;

  const points = REVENUE;
  const maxV = Math.max(...REVENUE);
  const minV = Math.min(...REVENUE);
  const range = maxV - minV || 1;
  const chartW = 1000;
  const chartH = 280;
  const padY = 12;
  const stepX = chartW / (points.length - 1);

  const xy = (v: number, i: number) => {
    const x = i * stepX;
    const y = padY + (chartH - padY * 2) - ((v - minV) / range) * (chartH - padY * 2);
    return [x, y] as const;
  };
  const xys = points.map((v, i) => xy(v, i));

  let path = `M ${xys[0][0]} ${xys[0][1]}`;
  for (let i = 0; i < xys.length - 1; i++) {
    const [x0, y0] = xys[Math.max(i - 1, 0)];
    const [x1, y1] = xys[i];
    const [x2, y2] = xys[i + 1];
    const [x3, y3] = xys[Math.min(i + 2, xys.length - 1)];
    const t = 0.18;
    const cp1x = x1 + (x2 - x0) * t;
    const cp1y = y1 + (y2 - y0) * t;
    const cp2x = x2 - (x3 - x1) * t;
    const cp2y = y2 - (y3 - y1) * t;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  const totalLen = 1800;
  const dashOffset = reduced ? 0 : Math.max(0, totalLen - tick * 360);

  const lastX = xys[xys.length - 1][0];
  const lastY = xys[xys.length - 1][1];

  const flipped = !reduced && tick >= 3;

  return (
    <div className="ph" aria-hidden="true">
      <div className="ph__body">
        <div className="ph__metric">
          <div className="ph__label">Revenue, year to date</div>
          <div className="ph__value" key={tick}>{fmt(revenue)}</div>
          <div className="ph__delta">
            <span className="material-symbols-outlined ph__arrow">trending_up</span>
            +18.4% vs last year
          </div>
        </div>

        <svg className="ph__chart" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="ph-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${path} L ${lastX} ${chartH} L 0 ${chartH} Z`}
            fill="url(#ph-fill)"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--green)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 900ms ease-out" }}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={lastX} cy={lastY} r="4" fill="var(--green)" />
        </svg>

        <div className="ph__axis" aria-hidden="true">
          {MONTHS.map((m) => <span key={m}>{m}</span>)}
        </div>

        <div className="ph__rows">
          <div className="ph__row">
            <div className="ph__row-label">Collected</div>
            <div className="ph__row-value">{fmt(collected)}</div>
            <StatusPill tone="done">On track</StatusPill>
          </div>
          <div className="ph__row">
            <div className="ph__row-label">Outstanding</div>
            <div className="ph__row-value">{fmt(outstanding)}</div>
            <StatusPill tone={flipped ? "done" : "attention"}>
              {flipped ? "Sent" : "Drafting follow-up"}
            </StatusPill>
          </div>
          <div className="ph__row">
            <div className="ph__row-label">Next invoice</div>
            <div className="ph__row-value">Due in {3 - (tick % 4)} days</div>
            <StatusPill tone="neutral">Queued</StatusPill>
          </div>
        </div>
      </div>
    </div>
  );
}
