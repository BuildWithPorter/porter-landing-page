/* Which dev-only financial health audit preview, if any, the current URL selects.
 *
 * Split out of devPreviews.tsx by POR-2226 because react-refresh requires a file
 * that exports components to export nothing else. Every predicate returns false
 * unless import.meta.env.DEV, so a production bundle cannot route to a preview
 * however the query string is set.
 */

function previewName(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("preview");
}

export function isWaitingPreview(): boolean {
  return previewName() === "report-wait";
}

export function isEditorialPreview(): boolean {
  return previewName() === "editorial-report";
}

export function isLeadGatePreview(): boolean {
  return previewName() === "lead-gate";
}

export function isRecoveryCodePreview(): boolean {
  return previewName() === "recovery-code";
}
