import type { ReactNode, HTMLAttributes } from "react";
import "./HairlineCard.css";

export function HairlineCard({ children, className, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`hairline-card ${className ?? ""}`} {...rest}>
      {children}
    </div>
  );
}
