/* Financial health audit document-readiness meter for the aside, extracted from
   the page by POR-2226. */

import { MaterialIcon } from "../MaterialIcon";
import type { AuditDocument } from "../../services/financialHealthAudit";
import { auditDocumentPresentation, isReadableAuditDocument } from "../../pages/financialHealthAuditDocuments";

export function DocumentReadingProgress({ documents }: { documents: AuditDocument[] }) {
  const total = documents.length;
  const ready = documents.filter(isReadableAuditDocument).length;
  const processing = documents.filter(
    (document) => document.status === "uploading" || document.status === "processing",
  ).length;
  const failed = documents.filter((document) => document.status === "failed").length;
  const partial = documents.filter((document) => {
    const presentation = auditDocumentPresentation(document);
    return presentation.completeness === "partial" && isReadableAuditDocument(document);
  }).length;
  const noText = documents.filter((document) => auditDocumentPresentation(document).label === "No text").length;
  const percentage = total ? Math.round((ready / total) * 100) : 0;
  const status = [
    processing ? `${processing} being read` : "",
    failed ? `${failed} need attention` : "",
    partial ? `${partial} partially read` : "",
    noText ? `${noText} with no text` : "",
  ].filter(Boolean).join(" · ") || "Ready for your report";

  return (
    <div className="fha-aside-documents">
      <p className="fha-aside-documents__label">
        <MaterialIcon name="document_scanner" />
        Documents
      </p>
      <p className="fha-aside-documents__count">
        <strong>{ready}</strong>
        <span>of {total} ready</span>
      </p>
      <div
        className="fha-aside-documents__track"
        role="progressbar"
        aria-label="Documents ready"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ready}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p className="fha-aside-documents__status">{status}</p>
    </div>
  );
}
