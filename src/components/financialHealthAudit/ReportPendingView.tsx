/* Financial health audit wait screen, extracted from the page by POR-2226. One
   component serves two states that look nothing alike: while phase !== "error"
   it is the animated status line (plus the file list on the documents path), and
   on error it is the recovery card. The error branch is also what the page mounts
   for a failed QuickBooks import, which is why recovery === "quickbooks" swaps the
   buttons for Sign in / Reconnect instead of Back / Generate report. */

import { useEffect, useState } from "react";
import { Calligraph } from "calligraph";
import { useReducedMotion } from "motion/react";
import { MaterialIcon } from "../MaterialIcon";
import { DocumentFileList } from "./DocumentFileList";
import { formatElapsedWait, formatWaitTime, reportWaitStatus } from "./reportWaitCopy";
import type { AuditDocument } from "../../services/financialHealthAudit";
import type {
  ReportPhase,
  ReportProgress,
  ReportRecovery,
} from "../../pages/financialHealthAuditState";

export function ReportPendingView({
  phase,
  progress,
  queuePosition,
  estimatedWaitSeconds,
  thinkingText,
  error,
  recovery,
  onRetry,
  onReconnectQuickBooks,
  onSignIn,
  onBack,
  titleRef,
  documents,
  uploadActive,
}: {
  phase: ReportPhase;
  progress: ReportProgress;
  queuePosition: number | null;
  estimatedWaitSeconds: number | null;
  thinkingText: string;
  error: string;
  recovery: ReportRecovery;
  onRetry: () => void;
  onReconnectQuickBooks: () => void;
  onSignIn: () => void;
  onBack: () => void;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  documents: AuditDocument[];
  uploadActive: boolean;
}) {
  const loading = phase !== "error";
  const reducedMotion = useReducedMotion();
  const status = reportWaitStatus(progress, queuePosition, thinkingText, documents, uploadActive);
  const elapsedSeconds = useElapsedSeconds(loading);
  const waitTime = queuePosition !== null && queuePosition > 0
    ? formatWaitTime(estimatedWaitSeconds)
    : formatElapsedWait(elapsedSeconds);
  const showFiles = documents.length > 0;

  return (
    <div className="fha-stage fha-stage--solo">
      <section className="fha-card fha-report-pending">
        {loading ? (
          <div className={`fha-report-wait ${showFiles ? "has-files" : ""}`}>
            <div className="fha-report-wait__headline" role="status" aria-live="polite" aria-atomic="true">
              <span className="fha-report-wait__pixels" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
              </span>
              <h1 ref={titleRef} tabIndex={-1}>
                {reducedMotion ? (
                  status
                ) : (
                  <Calligraph
                    animation="smooth"
                    autoSize
                    drift={{ x: 4, y: 1 }}
                    trend={0}
                    stagger={0.004}
                  >
                    {status}
                  </Calligraph>
                )}
              </h1>
              {waitTime ? <p>{waitTime}</p> : null}
            </div>
            {showFiles ? <DocumentFileList documents={documents} /> : null}
          </div>
        ) : (
          <>
            <div className="fha-card__head">
              <h1 ref={titleRef} tabIndex={-1}>
                {recovery === "quickbooks"
                  ? "QuickBooks import stopped."
                  : "Your report did not finish."}
              </h1>
              <p role="alert">{error}</p>
            </div>
            <div className="fha-card__foot">
              {recovery === "quickbooks" ? (
                <>
                  <button type="button" className="fha-button fha-button--quiet" onClick={onSignIn}>
                    Sign in to Porter
                  </button>
                  <button type="button" className="fha-button fha-button--primary" onClick={onReconnectQuickBooks}>
                    Reconnect QuickBooks
                    <MaterialIcon name="refresh" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="fha-button fha-button--quiet" onClick={onBack}>
                    Back
                  </button>
                  <button type="button" className="fha-button fha-button--primary" onClick={onRetry}>
                    Generate report
                    <MaterialIcon name="refresh" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  return seconds;
}
