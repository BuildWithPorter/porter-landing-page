import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { USE_CASES } from "../content/useCases";
// Reason: Challenges keeps the `pain` section classes (id, spacing, heading scale), so
// its rules stay beside the industry Pain section's in one stylesheet.
import "./Pain.css";

// Each challenge links to the demonstration that answers it, addressed by use-case id.
const CHALLENGES = [
  { title: "Your reports offer numbers, but little guidance.", film: 2, art: "challenge-1", alt: "A monthly report shows totals, but leaves the changes unexplained." },
  { title: "Your provider never really learns your business.", film: 13, art: "challenge-2", alt: "Three follow-ups ask you to explain a payment again." },
  { title: "You’re still chasing invoices and payments.", film: 3, art: "challenge-3", alt: "An outstanding invoice remains unpaid." },
  { title: "Keeping your tools in sync is another job.", film: 5, art: "challenge-4", alt: "Spreadsheets, accounting, payments and messages connect through tangled lines." },
];

// Reason: the homepage challenges were a `cinematic` flag on Pain that switched to an
// entirely separate render path. They share no state or markup with the industry
// Pain cards, so they are their own section.
export function Challenges({ standalone = false }: { standalone?: boolean } = {}) {
  return <section className="pain pain--cinematic section" id="pain">
    <div className="container pain__inner">
      <div className="pain__heading"><MicroLabel>What we solve</MicroLabel><SectionTitle as={standalone ? "h1" : "h2"} text="Finance should do more for your business." scrub={false} /><p>Too often, it's another chore, without the insight or support you need.</p></div>
      <div className="pain__overview">
        {CHALLENGES.map((item, index) => <a className="pain__challenge" key={item.film} href={`/use-cases/${USE_CASES.find(film => film.id === item.film)!.slug}`}>
          <img src={`/editorial/${item.art}.svg`} width="300" height="280" loading="lazy" alt={item.alt} />
          <span className="pain__index">{String(index+1).padStart(2,"0")}<span aria-hidden="true">↗</span></span>
          <h3>{item.title}</h3>
        </a>)}
      </div>
    </div>
  </section>;
}
