import { expect, it } from "vitest";
import {
  auditDocumentPresentation,
  isReadableAuditDocument,
} from "./financialHealthAuditDocuments";
import type { AuditDocument } from "./financialHealthAuditTypes";

const document = (overrides: Partial<AuditDocument> = {}): AuditDocument => ({
  id: "document-id",
  filename: "books.pdf",
  contentType: "application/pdf",
  sizeBytes: 1,
  status: "ready",
  errorMessage: null,
  createdAt: "2026-09-08T00:00:00Z",
  ...overrides,
});

it("keeps legacy ready documents usable when the API has no extraction receipt", () => {
  expect(isReadableAuditDocument(document())).toBe(true);
  expect(isReadableAuditDocument(document({ extractionSummary: null }))).toBe(true);
  expect(auditDocumentPresentation(document()).label).toBe("Ready");
  expect(auditDocumentPresentation(document({ extractionSummary: null })).label).toBe("Ready");
  const readableUnknown = document({ extractionSummary: {
    outcome: "succeeded",
    completeness: "unknown",
    readable: true,
  } });
  expect(isReadableAuditDocument(readableUnknown)).toBe(true);
  expect(auditDocumentPresentation(readableUnknown).label).toBe("Ready");
  const unknownReceipt = document({ extractionSummary: {
    outcome: "succeeded",
    completeness: "new_backend_value" as never,
    readable: true,
  } });
  expect(auditDocumentPresentation(unknownReceipt)).toMatchObject({ label: "Ready", completeness: "unknown" });
});

it("presents explicit extraction outcomes without inventing financial eligibility", () => {
  const partial = document({ extractionSummary: {
    outcome: "succeeded", completeness: "partial", readable: true,
    warnings: [{ code: "projection_limited", message: "Only part of this file could be read." }],
  } });
  const empty = document({ extractionSummary: {
    outcome: "succeeded", completeness: "empty", readable: false,
  } });
  const failed = document({ extractionSummary: {
    outcome: "failed", completeness: "unknown", readable: false,
  } });

  expect(isReadableAuditDocument(partial)).toBe(true);
  expect(auditDocumentPresentation(partial)).toMatchObject({ label: "Partially read", warnings: ["Only part of this file could be read."] });
  expect(isReadableAuditDocument(empty)).toBe(false);
  expect(auditDocumentPresentation(empty).label).toBe("No text");
  expect(auditDocumentPresentation(failed).label).toBe("Could not read");
});

it("fails closed when stale receipt fields contradict an explicit failed or empty outcome", () => {
  const failedButReadable = document({ extractionSummary: {
    outcome: "failed", completeness: "unknown", readable: true,
  } });
  const emptyButReadable = document({ extractionSummary: {
    outcome: "succeeded", completeness: "empty", readable: true,
  } });

  expect(isReadableAuditDocument(failedButReadable)).toBe(false);
  expect(isReadableAuditDocument(emptyButReadable)).toBe(false);
});

it("keeps lifecycle state ahead of a receipt that arrives before the row is ready", () => {
  expect(auditDocumentPresentation(document({ status: "uploading" })).label).toBe("Uploading…");
  expect(auditDocumentPresentation(document({ status: "processing" })).label).toBe("Reading…");
  expect(auditDocumentPresentation(document({ status: "failed" })).label).toBe("Could not read");
});
