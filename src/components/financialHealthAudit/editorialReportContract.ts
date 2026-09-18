/* Financial health audit editorial report contract, extracted from the page by
   POR-2226. This is the type guard that decides whether a persisted report can
   be rendered at all, plus the slide/tone derivations the carousel reads. It is
   deliberately separate from the renderers: the guard is the only thing standing
   between a stored report shape and the editorial view, so it should be
   reviewable without scrolling through JSX. */

import type { AuditReport, NarratedFinding } from "../../pages/financialHealthAuditFlow";
import { isAuditActionPlan, isNarratedFinding } from "../../pages/financialHealthAuditState";

export type EditorialAuditReport = Omit<AuditReport, "findings" | "additionalFindings"> & {
  version: 2;
  headline: string;
  reviewPeriod: string;
  summary: string;
  findings: NarratedFinding[];
  additionalFindings?: NarratedFinding[];
  actionPlan: NonNullable<AuditReport["actionPlan"]>;
  reliabilityNote: string;
};

export function isEditorialAuditReport(report: AuditReport): report is EditorialAuditReport {
  return (
    report.version === 2 &&
    typeof report.headline === "string" &&
    typeof report.reviewPeriod === "string" &&
    typeof report.summary === "string" &&
    report.findings.every(isNarratedFinding) &&
    (report.additionalFindings?.every(isNarratedFinding) ?? true) &&
    isAuditActionPlan(report.actionPlan) &&
    typeof report.reliabilityNote === "string"
  );
}

export type EditorialFindingTone = "neutral" | "positive" | "caution";

export type EditorialFindingSlide =
  {
    key: string;
    index: number;
    finding: NarratedFinding;
  };

export function getEditorialFindingSlides(findings: NarratedFinding[], indexOffset = 0): EditorialFindingSlide[] {
  return findings.map((finding, index) => ({
    key: `finding-${finding.checkId}`,
    index: index + indexOffset,
    finding,
  }));
}

export function findingTone(finding: NarratedFinding): EditorialFindingTone {
  if (finding.verdict === "looks_good") return "positive";
  if (finding.verdict === "needs_attention") return "caution";
  return "neutral";
}

export function findingVerdictLabel(verdict: NarratedFinding["verdict"]): string | null {
  if (verdict === "looks_good") return "Looks good";
  if (verdict === "needs_attention") return "Needs attention";
  return null;
}

