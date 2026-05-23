import { useEffect, useState } from "react";
import { Pill } from "./Pill";
import { useWaitlist } from "../components/WaitlistDialog";
import "./Nav.css";

const LINKS = [
  { href: "#pain", label: "What we solve" },
  { href: "#what", label: "What we do" },
  { href: "#software", label: "Our software" },
  { href: "#why", label: "Why Porter" },
];

export function Nav() {
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
            {LINKS.map((l) => (
              <a key={l.href} className="nav__link" href={l.href}>{l.label}</a>
            ))}
          </nav>
        </div>
        <div className="nav__cta">
          <Pill variant="primary" onClick={open}>Join our waitlist</Pill>
        </div>
      </div>
    </header>
  );
}
