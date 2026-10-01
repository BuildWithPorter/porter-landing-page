import { useEffect, useState } from "react";
import { Pill } from "./Pill";
import { useWaitlist } from "../components/WaitlistDialog";
import { useLocation } from "react-router-dom";
import { isMultiEntityHost } from "../industries";
import "./Nav.css";

const HOME_LINKS = [
  { href: "/#pain", label: "What we solve", page: "/what-we-solve" },
  { href: "/#what", label: "What Porter does", page: "/services" },
  { href: "/#software", label: "Our software", page: "/use-cases" },
  { href: "/#why", label: "Why Porter", page: "/why-porter" },
  { href: "/blog", label: "Blog", page: "/blog" },
];

export function Nav() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState("");
  const { open } = useWaitlist();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      if (pathname !== "/") return;
      const offset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height")) + 40;
      const current = HOME_LINKS.filter(l => l.href.includes("#")).filter(l => {
        const target = document.getElementById(l.href.split("#")[1]);
        return target && target.getBoundingClientRect().top <= offset;
      }).at(-1);
      setSection(current?.href ?? "");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [pathname]);

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="nav__inner container">
        <div className="nav__left">
          <a className="nav__brand" href="/" aria-label="Porter home">
            <img src="/porter-icon.svg" alt="Porter" />
          </a>
          <nav className="nav__links" aria-label="Primary">
            {HOME_LINKS.map((l) => (
              <a key={l.href} className="nav__link" href={l.href} aria-current={pathname === "/" ? (section === l.href ? "location" : undefined) : (pathname === l.page || pathname.startsWith(l.page + "/") ? "page" : undefined)}>{l.label}</a>
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
