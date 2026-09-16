/* Financial health audit wait-screen copy, extracted from the page by POR-2226.
   These decide the single line the visitor reads while a report generates. They
   are pure string functions kept apart from ReportPendingView so the precedence
   rules below -- which have been wrong twice, once inventing a queue and once
   re-parsing an already-collapsed activity tag -- can be read and tested without
   rendering the view. */

import type { AuditDocument } from "../../services/financialHealthAudit";
import type { ReportProgress } from "../../pages/financialHealthAuditState";

export function reportWaitStatus(
  progress: ReportProgress,
  queuePosition: number | null,
  thinkingText: string,
  documents: AuditDocument[],
  uploadActive: boolean,
): string {
  // Reason: "Joining queue" used to short-circuit here and win over everything
  // below, including a real activity string. On the QuickBooks path progress
  // stays "saving" for the whole ledger import, so a visitor watching a long
  // import saw "Joining queue" with a climbing timer for the entire wait while
  // "Importing your QuickBooks records" sat unused. There is also usually no
  // queue at all -- the genuine queue case is the queuePosition branch below.
  // Prefer any real activity, and never invent a queue.
  if (progress === "saving" && !thinkingText.trim() && !(queuePosition !== null && queuePosition > 0)) {
    return "Starting your audit";
  }
  if (progress === "reading") {
    return uploadActive || documents.some((document) => document.status === "uploading")
      ? "Uploading files"
      : "Reading files";
  }
  if (queuePosition !== null && queuePosition > 0) {
    return `${queuePosition} ahead`;
  }
  const trimmed = thinkingText.trim();
  if (!trimmed) return "Starting reasoning";
  // Reason: Porter already collapsed the thinking stream into a compact
  // activity tag on generationActivity. Re-parsing that tag as Markdown
  // headings turned published titles such as "Checking cash coverage"
  // back into generic "Reasoning", and heading-less thinking never left
  // "Starting reasoning".
  return latestReasoningSectionTitle(trimmed) ?? trimmed;
}

function latestReasoningSectionTitle(text: string): string | null {
  let latest: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
    const lineStartBold = trimmed.match(/^(?:[-*•·]\s*)?\*\*([^*\n]+)\*\*/);
    const title = (markdownHeading?.[1] ?? lineStartBold?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (title) latest = title;
  }
  // Reason: Porter chat labels its collapsed thinking tag with the latest
  // model-authored reasoning heading. Mirroring that rule makes this waiting
  // copy follow the actual analysis instead of an elapsed-time script.
  return latest;
}

export function formatWaitTime(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `≈ ${Math.max(1, Math.ceil(seconds / 60))} min`;
}

export function formatElapsedWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  const elapsed = `${minutes}:${remainder}`;
  // Reason: Actual audit runs exceeded the old one-minute promise; report elapsed time without inventing an ETA.
  return `${elapsed} elapsed`;
}
