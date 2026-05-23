import "./SectionGradient.css";

// A chart-shaped area-fill gradient that sits behind a section.
// No stroke, no dot — just the soft green fill under a curve.
// Each section uses a different `shape` so the gradients feel related
// but distinct (one section climbs, another dips, etc.).

type Props = {
  shape: number[]; // monotonic indices, values can be anything (height matters)
  intensity?: number; // top stopOpacity, default 0.10
  className?: string;
};

const VB_W = 1440;
const VB_H = 600;
const PAD_TOP = 40;
const PAD_BOT = 0;

function buildPath(values: number[]) {
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;
  const innerH = VB_H - PAD_TOP - PAD_BOT;
  const step = VB_W / (values.length - 1);

  const xys = values.map((v, i) => {
    const x = i * step;
    const y = PAD_TOP + innerH - ((v - minV) / range) * innerH;
    return [x, y] as const;
  });

  let d = `M ${xys[0][0].toFixed(2)} ${xys[0][1].toFixed(2)}`;
  for (let i = 0; i < xys.length - 1; i++) {
    const [x0, y0] = xys[Math.max(i - 1, 0)];
    const [x1, y1] = xys[i];
    const [x2, y2] = xys[i + 1];
    const [x3, y3] = xys[Math.min(i + 2, xys.length - 1)];
    const t = 0.2;
    const cp1x = x1 + (x2 - x0) * t;
    const cp1y = y1 + (y2 - y0) * t;
    const cp2x = x2 - (x3 - x1) * t;
    const cp2y = y2 - (y3 - y1) * t;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return { d, lastX: xys[xys.length - 1][0] };
}

// Stable gradient id counter so multiple instances on the page don't collide.
let gid = 0;

export function SectionGradient({ shape, intensity = 0.14, className }: Props) {
  const { d, lastX } = buildPath(shape);
  const id = `sg-${++gid}`;
  return (
    <div className={`section-gradient ${className ?? ""}`} aria-hidden="true">
      <svg
        className="section-gradient__svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity={intensity} />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${lastX} ${VB_H} L 0 ${VB_H} Z`}
          fill={`url(#${id})`}
        />
      </svg>
    </div>
  );
}

// Shape library — each section has its own characteristic curve.
// Keep them all 12 points so the spline density matches across sections.
export const SHAPES = {
  // What we solve: declines mid, then collapses — the "problem state."
  declining: [86, 92, 88, 80, 68, 55, 48, 40, 34, 28, 22, 18],

  // What we do: steady, confident climb.
  climb: [22, 28, 36, 46, 58, 70, 80, 92, 104, 118, 132, 146],

  // Our software: builds, plateaus high, holds — like a system that just works.
  plateau: [30, 48, 72, 102, 132, 152, 160, 158, 158, 156, 158, 160],

  // Why Porter: gentle S-curve that ramps slowly then accelerates.
  scale: [20, 24, 30, 38, 50, 64, 82, 102, 124, 148, 174, 200],
};
