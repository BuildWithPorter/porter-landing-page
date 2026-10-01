import { useEffect, useRef, useState, useSyncExternalStore, type MouseEventHandler, type ReactNode } from "react";
import { TrustStrip } from "./TrustStrip";
import { MicroLabel } from "../primitives/MicroLabel";
import { Pill } from "../primitives/Pill";
import "./HeroChart.css";

// Same dramatic data shape as the mockup chart so the experiment keeps
// Porter's visual rhythm: rise to mid-year, slight pullback, recovery to peak.
const REVENUE = [62, 78, 94, 112, 138, 152, 144, 132, 156, 184, 208, 236];

const DRAW_DURATION = 5000;
const DRAW_DELAY = 280;

const TOTAL = REVENUE.reduce((s, v) => s + v, 0) * 1000;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function buildPath(values: number[], width: number, height: number) {
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;
  // Draw in screen pixels: tall phones get a shallow sweep, not a stretched
  // desktop curve. Keep the endpoint inside the canvas so its dot stays whole.
  const innerW = width - 8;
  const innerH = Math.min(height * (520 / 720), width * 0.62);
  const bottom = height * (580 / 720);
  const step = innerW / (values.length - 1);

  const xys = values.map((v, i) => {
    const x = i * step;
    const y = bottom - ((v - minV) / range) * innerH;
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

// Reason (POR-3087): industry pages reuse this hero with their own copy and a
// CTA straight into the audit. Every prop is optional and the defaults are the
// homepage's exact markup, so the homepage renders unchanged. The homepage hero
// deliberately has no button (its CTAs live in the nav and closing section);
// only industry pages pass `cta`, because their visitors arrive from a
// segment-specific ad and the audit is the one next step being measured.
type HeroChartProps = {
  eyebrow?: string;
  title?: ReactNode;
  sub?: string;
  cta?: { label: string; href: string; onClick?: MouseEventHandler<HTMLAnchorElement> };
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => false;

export function HeroChart({ eyebrow, title, sub, cta }: HeroChartProps = {}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const startRef = useRef<number | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);
  const [{ progress, point }, setFrame] = useState({ progress: 0, point: { x: 0, y: 0 } });
  const width = size?.width ?? 1440;
  const height = size?.height ?? 720;
  const { d, xys } = buildPath(REVENUE, width, height);
  const [lastX] = xys[xys.length - 1];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width > 0 && height > 0) setSize(previous =>
        previous?.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const line = lineRef.current;
    if (!line || !size) return;
    const length = line.getTotalLength();
    const update = (progress: number) => {
      const point = line.getPointAtLength(progress * length);
      setFrame({ progress, point: { x: point.x, y: point.y } });
    };
    if (reduced) {
      update(1);
      return;
    }
    // Preserve the clock through resizes; reveal and marker share one sample.
    startRef.current ??= performance.now() + DRAW_DELAY;
    const start = startRef.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / DRAW_DURATION));
      update(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [d, size, reduced]);

  const drawn = progress > 0;
  const value = Math.round(TOTAL * progress);
  const playing = !reduced && progress > 0 && progress < 1;
  const labelLeft = `${(point.x / width) * 100}%`;
  const labelTop = `${(point.y / height) * 100}%`;

  return (
    <section className={cta ? "hc hc--industry" : "hc"}>
      <div ref={canvasRef} className="hc__canvas">
        <svg
          className="hc__svg"
          viewBox={`0 0 ${width} ${height}`}
          style={{ visibility: size ? "visible" : "hidden" }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id="hc-reveal"><rect x="-10" y="-10" width={progress >= 1 ? width + 20 : point.x + 10} height={height + 20} /></clipPath>
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
            d={`${d} L ${lastX} ${height} L 0 ${height} Z`}
            fill="url(#hc-fill)"
            clipPath="url(#hc-reveal)"
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
            clipPath="url(#hc-reveal)"
            className="hc__line"
          />
          {/* One fixed-size marker remains at the endpoint after drawing. */}
          <circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="var(--green)"
            className={`hc__dot ${drawn ? "is-drawn" : ""}`}
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
        {eyebrow && <MicroLabel>{eyebrow}</MicroLabel>}
        <h1 className="hc__title">
          {title ?? <>An entire finance team,<br />at your fingertips.</>}
        </h1>
        <p className="hc__sub">
          {sub ??
            "Porter gives you an enterprise-grade finance team and a modern accounting software built for the AI age, at a fraction of the cost."}
        </p>
        {cta && (
          <div className="hc__cta">
            <Pill variant="primary" size="lg" href={cta.href} onClick={cta.onClick}>
              {cta.label}
            </Pill>
          </div>
        )}
      </div>

      {/* Reason: the trust strip names every segment Porter serves; on a
          single-industry page it would undercut "built for you". */}
      {!cta && <TrustStrip />}
    </section>
  );
}
