/* Financial health audit report entry point, extracted from the page by POR-2226.
   The page mounts this, not EditorialReportView, so the version-2 narrowing stays
   in one place. */

import { isEditorialAuditReport } from "./editorialReportContract";
import { EditorialReportView } from "./EditorialReportView";
import type { AuditPath, AuditReport } from "../../pages/financialHealthAuditFlow";

export type ReportViewProps = {
  report: AuditReport;
  path: AuditPath | null;
  capturedEmail: string | null;
  capturedFirstName: string | null;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

export function ReportView(props: ReportViewProps) {
  // Reason: isAuditReport rejects anything that is not the version-2 editorial
  // contract, so this narrowing cannot fall through in practice. It stays as a
  // type guard rather than a cast.
  if (isEditorialAuditReport(props.report)) {
    return <EditorialReportView {...props} report={props.report} />;
  }
  return null;
}
