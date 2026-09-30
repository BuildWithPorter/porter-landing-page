import { useState } from "react";
import { MicroLabel } from "../primitives/MicroLabel";
import { SectionTitle } from "../primitives/SectionTitle";
import { Pill } from "../primitives/Pill";
import { UseCaseFilm } from "../components/UseCaseFilm";
import { USE_CASES } from "../content/useCases";
import "./PorterIsSoftware.css";

const MOMENTS = [
  { id: 2, title: "Ask. Understand.", label: "In the Porter app", body: "A report tells you what happened. Ask Porter why. Follow the answer into a chart, a transaction, or the next question." },
  { id: 8, title: "See it coming.", label: "A little further ahead", body: "See a cash gap before payday. Porter shows what's due and which invoices to send, while there's still time to act." },
  { id: 6, title: "Stay in your flow.", label: "ChatGPT. Claude. Porter.", body: "Connect your books to ChatGPT or Claude. Ask a question in the conversation you're already having. The answer comes from Porter." },
];
export function PorterIsSoftware() {
  const [active, setActive] = useState(0);
  const moment = MOMENTS[active];
  const item = USE_CASES.find(item => item.id === moment.id)!;
  return <section className="pis section" id="software"><div className="container pis__inner">
    <div className="pis__heading"><MicroLabel>The software</MicroLabel><SectionTitle text="Your numbers. Within reach." scrub={false} className="pis__title" />
      <p>Real accounting software. A finance team behind it. A simpler way to know what's happening.</p></div>
    <div className="pis__experience">
      <div className="pis__stage"><UseCaseFilm key={item.slug} item={item} /></div>
      <div className="pis__editorial">
        <div className="pis__selector" aria-label="Choose a product demonstration">{MOMENTS.map((m,index) => <Pill variant={index === active ? "primary" : "ghost"} key={m.id} aria-pressed={index === active} aria-label={m.title} onClick={() => setActive(index)}>{String(index+1).padStart(2,"0")}</Pill>)}</div>
        <div className="pis__chapter" key={item.slug}><MicroLabel>{moment.label}</MicroLabel><h3>{moment.title}</h3><p>{moment.body}</p><a href={`/use-cases/${item.slug}`}>See how it works <span aria-hidden="true">↗</span></a></div>
        <div className="pis__footnote">Your books stay connected.<br />Your team stays close.</div>
      </div>
    </div>
  </div></section>;
}
