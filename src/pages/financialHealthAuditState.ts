import {
  FLOWS,
  SHARED_FLOW,
  STEPS,
  canContinue,
  type AuditAnswers,
  type AuditPath,
} from "./financialHealthAuditFlow.ts";

type StoredAuditLocation = {
  answers: AuditAnswers;
  path: AuditPath | null;
  stepId: string;
  hasReport: boolean;
};

export function leadCaptureDestination(
  recoveryAvailable: boolean | undefined,
): "recovery" | "generation" {
  // Reason: Generate is the only visitor action. Keep the server-provided
  // repeat-report decision explicit so the page cannot drift back to a second
  // recovery button or accidentally generate over an existing report.
  return recoveryAvailable ? "recovery" : "generation";
}

export function normalizeStoredAuditLocation(
  value: StoredAuditLocation,
): Pick<StoredAuditLocation, "path" | "stepId"> {
  const selectedConnection = value.answers.connection_choice;
  const answeredPath = selectedConnection === "quickbooks"
    ? "connected"
    : selectedConnection === "documents"
      ? "documents"
      : selectedConnection === "questions"
        ? "unconnected"
        : null;
  // Reason: A recovered report intentionally has no questionnaire answers or
  // browser bearer. Its server-provided path is still authoritative after a
  // refresh, while unfinished sessions continue to derive path from answers.
  const path = answeredPath ?? (value.hasReport ? value.path : null);
  const flow = path ? FLOWS[path] : SHARED_FLOW;
  let stepId = flow.includes(value.stepId) ? value.stepId : flow[0];
  if (!value.hasReport) {
    const currentIndex = Math.max(0, flow.indexOf(stepId));
    const firstIncomplete = flow
      .slice(0, currentIndex + 1)
      .find((candidate) => !canContinue(STEPS[candidate], value.answers));
    if (firstIncomplete) stepId = firstIncomplete;
  }
  return { path, stepId };
}
