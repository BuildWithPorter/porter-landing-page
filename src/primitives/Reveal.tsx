import type { ReactNode } from "react";
import { useInView } from "../hooks/useInView";

export function Reveal({ children, as: As = "div", delay = 0, className }: { children: ReactNode; as?: "div" | "section" | "header" | "footer"; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.15 });
  return (
    <As
      ref={ref as never}
      className={`reveal ${inView ? "is-visible" : ""} ${className ?? ""}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </As>
  );
}
