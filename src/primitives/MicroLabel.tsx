import type { ReactNode } from "react";
import "./MicroLabel.css";

export function MicroLabel({ children, as: As = "div" }: { children: ReactNode; as?: "div" | "span" | "p" }) {
  return <As className="micro-label">{children}</As>;
}
