import { useEffect, useRef, useState } from "react";
import { TrustStrip } from "./TrustStrip";
import "./HeroChart.css";

// Same dramatic data shape as the mockup chart so the experiment keeps
// Porter's visual rhythm: rise to mid-year, slight pullback, recovery to peak.
const REVENUE = [62, 78, 94, 112, 138, 152, 144, 132, 156, 184, 208, 236];

// SVG viewBox the chart is drawn into. preserveAspectRatio="none" lets it
// stretch to the section, so the curve always sweeps the full hero canvas.
const VB_W = 1440;
const VB_H = 720;
// Chart spans the full viewport width so the line and dot land on the right edge.
const PAD_X_LEFT = 0;
const PAD_X_RIGHT = 0;
const PAD_TOP = 60;   // peak lands ~10% from the top
const PAD_BOT = 140;  // bottom of the curve sits well above the trust strip

const DRAW_DURATION = 5000;
const DRAW_DELAY = 280;

const TOTAL = REVENUE.reduce((s, v) => s + v, 0) * 1000;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function buildPath(values: number[]) {
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;
  const innerW = VB_W - PAD_X_LEFT - PAD_X_RIGHT;
  const innerH = VB_H - PAD_TOP - PAD_BOT;
  const step = innerW / (values.length - 1);

  const xys = values.map((v, i) => {
    const x = PAD_X_LEFT + i * step;
    const y = PAD_TOP + innerH - ((v - minV) / range) * innerH;
    return [x, y] as const;
  });

  let d = `M ${xys[0][0].toFixed(2)} ${xys[0][1].toFixed(2)}`;
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
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return { d, xys };
}

export function HeroChart() {
  const lineRef = useRef<SVGPathElement | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 along the line
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!lineRef.current) return;
    const l = lineRef.current.getTotalLength();

    if (reduced) {
      setDrawn(true);
      setProgress(1);
      return;
    }

    let raf = 0;
    let started = false;
    const startWhen = performance.now() + DRAW_DELAY;

    const tick = (now: number) => {
      if (now < startWhen) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!started) {
        started = true;
        setDrawn(true); // kicks off the CSS line draw too
      }
      const elapsed = now - startWhen;
      const t = Math.min(1, elapsed / DRAW_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out matches line transition
      setProgress(eased);
      if (lineRef.current) {
        const pt = lineRef.current.getPointAtLength(eased * l);
        setPoint({ x: pt.x, y: pt.y });
      }
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const { d, xys } = buildPath(REVENUE);
  const [lastX, lastY] = xys[xys.length - 1];

  const value = Math.round(TOTAL * progress);
  const playing = !reduced && progress > 0 && progress < 1;

  // Position the floating label as a percentage of the canvas — converts
  // SVG viewBox coords to layout-space coords (since SVG stretches via preserveAspectRatio="none").
  const labelLeft = point ? `${(point.x / VB_W) * 100}%` : "0%";
  const labelTop = point ? `${(point.y / VB_H) * 100}%` : "0%";

  return (
    <section className="hc">
      <div className="hc__canvas">
        <svg
          className="hc__svg"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hc-stroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--green-deep)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="1" />
            </linearGradient>
          </defs>

          <path
            d={`${d} L ${lastX} ${VB_H} L 0 ${VB_H} Z`}
            fill="url(#hc-fill)"
            className={`hc__fill ${drawn ? "is-drawn" : ""}`}
          />
          <path
            ref={lineRef}
            d={d}
            fill="none"
            stroke="url(#hc-stroke)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            className="hc__line"
          />
          {/* Playhead — a moving dot that rides the line as it draws. */}
          {playing && point && (
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="var(--green)"
              className="hc__play"
            />
          )}
          {/* Terminal dot — appears once at the very end and stays. */}
          <circle
            cx={lastX}
            cy={lastY}
            r="5"
            fill="var(--green)"
            className={`hc__dot ${progress >= 0.999 ? "is-drawn" : ""}`}
          />
        </svg>

        {/* Floating value label rides with the dot during the draw-in, then fades. */}
        {playing && point && (
          <div
            className="hc__readout"
            style={{ left: labelLeft, top: labelTop }}
          >
            <span className="hc__readout-label">YTD</span>
            <span className="hc__readout-value">{fmt(value)}</span>
          </div>
        )}
      </div>

      <div className="container hc__content">
        <h1 className="hc__title">
          An entire finance team,<br />at your fingertips.
        </h1>
        <p className="hc__sub">
          Porter gives you an enterprise-grade finance team and a modern accounting software built for the AI age, at a fraction of the cost.
        </p>
      </div>

      <TrustStrip />
    </section>
  );
}
