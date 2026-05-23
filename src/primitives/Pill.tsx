import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import "./Pill.css";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type PillProps =
  | (BaseProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">)
  | (BaseProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">);

export function Pill(props: PillProps) {
  const { variant = "primary", size = "md", children, className, ...rest } = props;
  const cls = `pill pill--${variant} pill--${size} ${className ?? ""}`.trim();
  if ("href" in props && props.href) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a className={cls} href={href} {...anchorRest}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
