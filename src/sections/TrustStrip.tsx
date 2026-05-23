import "./TrustStrip.css";

export function TrustStrip() {
  return (
    <section className="trust" aria-label="Customers">
      <div className="container">
        <p className="trust__line">
          <span className="trust__lead">Trusted by</span>
          <span className="trust__sep">·</span>
          <span>VC-backed startups</span>
          <span className="trust__sep">·</span>
          <span>SMBs</span>
          <span className="trust__sep">·</span>
          <span>Proptech</span>
          <span className="trust__sep">·</span>
          <span>Healthtech</span>
          <span className="trust__sep">·</span>
          <span>Professional services</span>
          <span className="trust__sep">·</span>
          <span>Home services</span>
        </p>
      </div>
    </section>
  );
}
