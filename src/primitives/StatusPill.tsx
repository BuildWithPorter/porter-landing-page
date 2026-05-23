import "./StatusPill.css";

type Tone = "done" | "attention" | "overdue" | "neutral";

export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: string }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
