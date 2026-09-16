/* Financial health audit progress rail, extracted from the page by POR-2226. */

import { MaterialIcon } from "../MaterialIcon";

export function ProgressRail({ flow, currentId }: { flow: string[]; currentId: string }) {
  const currentIndex = flow.indexOf(currentId);
  return (
    <ol className="fha-rail" aria-label="Audit progress">
      {flow.map((id, index) => {
        const current = id === currentId;
        const done = currentIndex > index;
        return (
          <li key={id} className={`${current ? "is-current" : ""} ${done ? "is-done" : ""}`} aria-current={current ? "step" : undefined}>
            <span>{done ? <MaterialIcon name="check" /> : index + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}
