import "./Footer.css";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <img
            className="footer__logo"
            src="/porter-logo-dark.svg"
            alt="Porter"
          />
          <p className="footer__tagline">An entire finance team, at your fingertips.</p>
        </div>
        <div className="footer__cols">
          <div className="footer__col">
            <div className="footer__heading">Product</div>
            <a href="#what">What we do</a>
            <a href="#software">Our software</a>
            <a href="/slack">Porter for Slack</a>
          </div>
          <div className="footer__col">
            <div className="footer__heading">Company</div>
            <a href="mailto:support@buildwithporter.com">Contact</a>
            <a href="/support">Support</a>
          </div>
          <div className="footer__col">
            <div className="footer__heading">Legal</div>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms and Conditions</a>
            <a href="/legal/subprocessors">Sub-processors</a>
          </div>
        </div>
      </div>
      <div className="container footer__base">
        <span>© {new Date().getFullYear()} Porter Operations LLC</span>
        <a href="mailto:support@buildwithporter.com">support@buildwithporter.com</a>
      </div>
    </footer>
  );
}
