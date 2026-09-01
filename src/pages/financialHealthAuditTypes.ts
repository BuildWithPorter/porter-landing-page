import type {
  AuditAnswers,
  AuditPath,
  AuditReport,
} from "./financialHealthAuditFlow.ts";

export type AuditSnapshot = {
  stepId: string;
  path: AuditPath | null;
  answers: AuditAnswers;
  capturedEmail?: string | null;
  capturedFirstName?: string | null;
};

export type QuickBooksConnectionStatus = "not_started" | "pending" | "connected" | "failed";

export type AuditRemoteSession = {
  id: string;
  stepId?: string;
  path?: AuditPath | null;
  answers?: AuditAnswers;
  status: "in_progress" | "generating" | "completed" | "failed";
  report: AuditReport | null;
  queuePosition?: number | null;
  estimatedWaitSeconds?: number | null;
  generationActivity?: string | null;
  accessToken?: string;
  capturedEmail?: string | null;
  capturedFirstName?: string | null;
  recoveryAvailable?: boolean;
  connectionStatus?: QuickBooksConnectionStatus;
  qboCompanyName?: string | null;
  qboConnectedAt?: string | null;
};

export type QuickBooksConnectionState = {
  status: QuickBooksConnectionStatus;
  companyName: string | null;
  connectedAt: string | null;
  errorMessage: string | null;
};

export type RecoveredFinancialHealthAudit = {
  id: string;
  path: AuditPath | null;
  report: AuditReport | null;
  session?: AuditRemoteSession & {
    stepId: string;
    path: AuditPath | null;
    answers: AuditAnswers;
    accessToken: string;
  };
  capturedEmail: string;
  capturedFirstName: string | null;
};

export type FinancialHealthAuditEmailChallenge = {
  challengeId: string;
  developmentCode?: string;
};

export type AuditDocumentStatus = "uploading" | "processing" | "ready" | "failed";

export type AuditDocument = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number | null;
  status: AuditDocumentStatus;
  errorMessage: string | null;
  createdAt: string;
};

export type AuditDocumentPreflight = {
  eligible: boolean;
  message: string;
};
