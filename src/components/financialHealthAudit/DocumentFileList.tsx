/* Financial health audit uploaded-file list, extracted from the page by POR-2226.
   Rendered in two places: inside DocumentUploadField while someone is still
   adding files, and inside ReportPendingView so the files stay visible during the
   wait. Both callers pass the same rows, so the status wording cannot diverge. */

import { MaterialIcon } from "../MaterialIcon";
import { StatusPill } from "../../primitives/StatusPill";
import type { AuditDocument } from "../../services/financialHealthAudit";
import { auditDocumentPresentation } from "../../pages/financialHealthAuditDocuments";

export function DocumentFileList({ documents }: { documents: AuditDocument[] }) {
  return (
    <ul className="fha-document-list" aria-live="polite">
      {documents.map((document) => {
        const presentation = auditDocumentPresentation(document);
        return <li key={document.id}>
          <MaterialIcon name="description" />
          <span className="fha-document-list__name">{document.filename}</span>
          <span className={`fha-document-list__status is-${document.status}`}>
            <StatusPill tone={presentation.tone}>{presentation.label}</StatusPill>
          </span>
          {document.errorMessage ? <small className="is-error">{document.errorMessage}</small> : null}
          {presentation.warnings.map((warning) => <small className="is-warning" key={warning}>{warning}</small>)}
        </li>;
      })}
    </ul>
  );
}
