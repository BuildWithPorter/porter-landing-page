import { ProductHero } from "../mockups/ProductHero";
import { TrustStrip } from "./TrustStrip";
import "./Hero.css";

// Marketing-only exception: EB Garamond is used at hero scale here per the
// rebuild handoff. App-interior rules in BIBLE.md still apply elsewhere.
export function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__copy">
          <h1 className="hero__title">
            Your entire finance team.<br />At your fingertips.
          </h1>
          <p className="hero__sub">
            Porter gives you an enterprise-grade finance team and a modern accounting software built for the AI age, at a fraction of the cost.
          </p>
        </div>
        <div className="hero__visual">
          <ProductHero />
        </div>
      </div>
      <TrustStrip />
    </section>
  );
}
