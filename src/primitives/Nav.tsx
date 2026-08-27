import { useEffect, useState } from "react";
import { Pill } from "./Pill";
import { useWaitlist } from "../components/WaitlistDialog";
import { openCalendlyPopup } from "../lib/calendly";
import "./Nav.css";

const DEMO_CALENDLY_URL = "https://calendly.com/michael-buildwithporter/porter";

// Absolute hrefs so anchors work from /blog as well as /. Browsers handle
// "/#pain" on the home page the same as "#pain"; on /blog they navigate to /
// and then scroll to the anchor.
const LINKS = [
  { href: "/#pain", label: "What we solve" },
  { href: "/#what", label: "What we do" },
  { href: "/#software", label: "Our software" },
  { href: "/#why", label: "Why Porter" },
  { href: "/blog", label: "Blog" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { open } = useWaitlist();

  // Reason: Capture the lead before opening Calendly so Porter still hears from
  // visitors who do not finish scheduling on the free Calendly plan.
  const openDemoForm = () => {
    open({
      action: "book_demo",
      onSuccess: ({ name, email, company, existingFinanceTeam, helpWith }) => {
        const calendlyUrl = new URL(DEMO_CALENDLY_URL);
        if (name) calendlyUrl.searchParams.set("name", name);
        if (email) calendlyUrl.searchParams.set("email", email);
        if (company) calendlyUrl.searchParams.set("a1", company);
        if (existingFinanceTeam) calendlyUrl.searchParams.set("a2", existingFinanceTeam);
        if (helpWith) calendlyUrl.searchParams.set("a3", helpWith);
        calendlyUrl.searchParams.set("utm_source", "porter");
        calendlyUrl.searchParams.set("utm_medium", "website");
        calendlyUrl.searchParams.set("utm_campaign", "landing_page_demo");
        if (company) calendlyUrl.searchParams.set("utm_content", company);
        if (existingFinanceTeam) calendlyUrl.searchParams.set("utm_term", existingFinanceTeam);
        void openCalendlyPopup(calendlyUrl.toString());
      },
    });
  };

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
          <Pill variant="primary" onClick={openDemoForm}>
            Book a demo
          </Pill>
        </div>
      </div>
    </header>
  );
}
