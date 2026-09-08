import type { AuditDocument, AuditDocumentExtractionSummary } from "./financialHealthAuditTypes";

export type AuditDocumentPresentation = {
  label: string;
  tone: "done" | "attention" | "overdue" | "neutral";
  warnings: string[];
  completeness: "complete" | "partial" | "empty" | "unknown";
};

function summaryFor(document: AuditDocument): AuditDocumentExtractionSummary | null {
  return document.extractionSummary ?? null;
}

function completenessFor(summary: AuditDocumentExtractionSummary | null): AuditDocumentPresentation["completeness"] {
  if (!summary) return "unknown";
  return ["complete", "partial", "empty", "unknown"].includes(summary.completeness)
    ? summary.completeness
    : "unknown";
}

export function isReadableAuditDocument(document: AuditDocument): boolean {
  if (document.status !== "ready") return false;
  const summary = summaryFor(document);
  // Reason (POR-2324): Older API responses have no extraction receipt. Their
  // established `ready` lifecycle remains usable until the API can describe it.
  if (!summary) return true;
  // Reason (POR-2324): A stale or inconsistent transport payload must not let
  // a failed or empty receipt pass the local readiness gate merely because an
  // earlier projection left `readable` true. The API normally prevents this,
  // but the public adapter must fail closed when its receipt facts conflict.
  if (summary.outcome === "failed" || completenessFor(summary) === "empty") return false;
  return summary.readable;
}

export function auditDocumentPresentation(document: AuditDocument): AuditDocumentPresentation {
  const summary = summaryFor(document);
  const completeness = completenessFor(summary);
  const warnings = summary?.warnings?.map((warning) => warning.message).filter(Boolean) ?? [];

  if (document.status === "uploading") return { label: "Uploading…", tone: "neutral", warnings, completeness };
  if (document.status === "processing") return { label: "Reading…", tone: "neutral", warnings, completeness };
  if (document.status === "failed" || summary?.outcome === "failed") {
    return { label: "Could not read", tone: "overdue", warnings, completeness };
  }
  if (completeness === "partial" && summary?.readable) {
    return { label: "Partially read", tone: "attention", warnings, completeness };
  }
  if (completeness === "empty" || summary?.readable === false) {
    return { label: "No text", tone: "attention", warnings, completeness };
  }
  return { label: "Ready", tone: "done", warnings, completeness };
}
