import { useState } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Pill } from "../primitives/Pill";
import { UseCaseFilm } from "../components/UseCaseFilm";
import { USE_CASES } from "../content/useCases";
import "./PorterIsSoftware.css";

const MOMENTS = [
  { id: 2, title: "Ask your books anything.", label: "In the Porter app", body: "Ask why the numbers changed. Follow the answer into a chart or transaction." },
  { id: 8, title: "See cash gaps early.", label: "Cash planning", body: "See a cash gap before payday, with the invoices and payments behind it." },
  { id: 6, title: "Use ChatGPT or Claude.", label: "Connected to your books", body: "Ask about your books in ChatGPT or Claude. Porter brings the numbers to the conversation." },
];
export function PorterIsSoftware({ standalone = false }: { standalone?: boolean } = {}) {
  const ChapterTitle = standalone ? "h2" : "h3";
  const [active, setActive] = useState(0);
  const moment = MOMENTS[active];
  const item = USE_CASES.find(item => item.id === moment.id)!;
  return <section className="pis section" id="software"><div className="container pis__inner">
    <div className="pis__heading"><MicroLabel>Our software</MicroLabel><SectionTitle as={standalone ? "h1" : "h2"} text="Your numbers. Within reach." scrub={false} className="pis__title" />
      <p>Your books, answers and finance team. In one place.</p></div>
    <div className="pis__experience">
      <div className="pis__stage"><UseCaseFilm key={item.slug} item={item} priority={standalone} /></div>
      <div className="pis__editorial">
        <div className="pis__selector" aria-label="Choose a product demonstration">{MOMENTS.map((m,index) => <Pill variant={index === active ? "primary" : "secondary"} key={m.id} aria-pressed={index === active} aria-label={`${String(index+1).padStart(2,"0")} ${m.title}`} onClick={() => setActive(index)}>{String(index+1).padStart(2,"0")} {["Ask", "Plan", "Connect"][index]}</Pill>)}</div>
        <div className="pis__chapter" key={item.slug}><MicroLabel>{moment.label}</MicroLabel><ChapterTitle>{moment.title}</ChapterTitle><p>{moment.body}</p><a href={`/use-cases/${item.slug}`}>See how it works <span aria-hidden="true">↗</span></a></div>
      </div>
    </div>
    <div className="pis__collection"><Pill href="/use-cases" size="lg" variant="primary">Explore all 20 demonstrations <span aria-hidden="true">↗</span></Pill></div>
  </div></section>;
}
