/* Financial health audit sidebar, extracted from the page by POR-2226. Returns
   null for any step whose aside is neither "scan" nor "counter"; the intro step
   deliberately renders no aside, which is what fha-stage--solo widens the card
   for. */

import { DocumentReadingProgress } from "./DocumentReadingProgress";
import type { AuditStep } from "../../pages/financialHealthAuditFlow";
import type {
  AuditDocument,
  QuickBooksConnectionStatus,
} from "../../services/financialHealthAudit";

export function AuditAside({
  step,
  questionsLeft,
  onConnect,
  documents,
  showDocumentProgress,
  connectedPath,
  quickBooksConnectionStatus,
}: {
  step: AuditStep;
  questionsLeft: number;
  onConnect: () => void;
  documents: AuditDocument[];
  showDocumentProgress: boolean;
  connectedPath: boolean;
  quickBooksConnectionStatus: QuickBooksConnectionStatus;
}) {
  const documentProgress = showDocumentProgress && documents.length
    ? <DocumentReadingProgress documents={documents} />
    : null;

  if (step.aside === "scan") {
    return (
      <aside className="fha-aside" aria-live="polite">
        <p className="fha-aside__eyebrow"><span className="fha-scan-dot" />Reviewing your answers</p>
        <div className="fha-scan-lines" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        {documentProgress}
      </aside>
    );
  }
  if (step.aside === "counter") {
    const quickBooksStatus = connectedPath ? (
      <div className={`fha-aside__qbo-status is-${quickBooksConnectionStatus}`} role="status">
        <span className="fha-scan-dot" aria-hidden="true" />
        <span>
          {quickBooksConnectionStatus === "connected"
            ? "QuickBooks ready"
            : "Importing QuickBooks"}
        </span>
      </div>
    ) : (
      <button type="button" className="fha-aside__connect" onClick={onConnect}>
        <span className="fha-qb fha-qb--small">qb</span>
        I use QuickBooks
      </button>
    );
    return (
      <aside className="fha-aside">
        <strong className="fha-counter">{questionsLeft}</strong>
        <span className="fha-counter__label">question{questionsLeft === 1 ? "" : "s"} to go</span>
        {quickBooksStatus}
        {documentProgress}
      </aside>
    );
  }
  return null;
}
