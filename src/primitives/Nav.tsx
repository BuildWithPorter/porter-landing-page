import { useEffect, useState } from "react";
import { Pill } from "./Pill";
import { useWaitlist } from "../components/WaitlistDialog";
import { useLocation } from "react-router-dom";
import { SITE_LINKS } from "../content/sitePages";
import { isMultiEntityHost } from "../industries";
import "./Nav.css";

export function Nav() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { open } = useWaitlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="nav__inner container">
        <div className="nav__left">
          <a className="nav__brand" href="/" aria-label="Porter home">
            <img src="/porter-icon.svg" alt="Porter" />
          </a>
          <nav className="nav__links" aria-label="Primary">
            {[...SITE_LINKS, { href: "/blog", label: "Blog" }].map((l) => (
              <a key={l.href} className="nav__link" href={l.href} aria-current={pathname === l.href || (l.href === "/use-cases" && pathname.startsWith("/use-cases/")) ? "page" : undefined}>{l.label}</a>
            ))}
          </nav>
        </div>
        <div className="nav__cta">
          <Pill
            variant="primary"
            onClick={() => {
              const multiEntity = isMultiEntityHost(window.location.hostname);
              open({ multiEntity, ...(multiEntity ? { action: "book_demo" as const } : {}) });
            }}
          >
            Talk to Porter
          </Pill>
        </div>
      </div>
    </header>
  );
}
