/* Financial health audit document intake, extracted from the page by POR-2226.
   The accept list and the 50-file / 50MB copy mirror the limits the controller
   enforces; if one moves, move both. */

import { MaterialIcon } from "../MaterialIcon";
import { DocumentFileList } from "./DocumentFileList";
import type { AuditDocument } from "../../services/financialHealthAudit";

export function DocumentUploadField({
  documents,
  error,
  uploading,
  checking,
  onFiles,
}: {
  documents: AuditDocument[];
  error: string;
  uploading: boolean;
  checking: boolean;
  onFiles: (files: FileList | File[]) => void;
}) {
  const processing = documents.some(
    (document) => document.status === "uploading" || document.status === "processing",
  );
  return (
    <div className="fha-documents">
      <div className="fha-document-guidance" aria-label="Most useful financial documents">
        <p className="fha-document-guidance__label">Most useful files</p>
        <div className="fha-document-guidance__grid">
          {[
            { icon: "insert_chart", label: "Profit & loss" },
            { icon: "account_balance", label: "Balance sheet" },
            { icon: "credit_card", label: "Bank or card statements" },
            { icon: "schedule", label: "A/R or A/P aging" },
          ].map((item) => (
            <div className="fha-document-guidance__item" key={item.label}>
              <MaterialIcon name={item.icon} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <label
        className={`fha-document-dropzone ${uploading || checking ? "is-uploading" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!uploading && !checking && event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.tsv,.txt,.md,.docx,.xlsx,.xls,.xlsm,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
          disabled={uploading || checking}
          onChange={(event) => {
            if (event.currentTarget.files?.length) onFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <MaterialIcon name="cloud_upload" />
        <strong>
          {checking
            ? "Checking your files..."
            : uploading
              ? "Uploading your files…"
              : "Drop files here, or choose files"}
        </strong>
        <small>PDF, spreadsheet, Word, image, or text file. Up to 50 files, 50MB each.</small>
      </label>
      <p className="fha-document-hint">
        For the strongest audit, include a recent profit and loss, balance sheet, bank or card statement, and A/R or A/P aging report.
      </p>
      {documents.length ? <DocumentFileList documents={documents} /> : null}
      {processing ? <p className="fha-document-progress">Porter is reading your files. You can add more while it works.</p> : null}
      {error ? <p className="fha-connect-status is-error" aria-live="polite">{error}</p> : null}
    </div>
  );
}
