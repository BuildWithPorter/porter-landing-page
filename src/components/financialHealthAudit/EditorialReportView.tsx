/* Financial health audit report renderer, extracted from the page by POR-2226.
   Renders authored report fields verbatim: the only transformations left here
   are highlighting numbers and formatting the snapshot date. Read the Reason
   comments before adding any copy assembly -- both of them record a real report
   this layer previously rewrote. */

import { EditorialFindingCarousel } from "./EditorialFindingCarousel";
import {
  formatAuditSnapshotDate,
  renderNumericCopy,
  sourceLabel,
} from "./reportCopy";
import {
  getEditorialFindingSlides,
  type EditorialAuditReport,
} from "./editorialReportContract";
import type { ReportViewProps } from "./ReportView";
import { openCalendlyPopup, PORTER_DEMO_CALENDLY_URL } from "../../lib/calendly";
import { trackFinancialHealthAudit as track } from "../../pages/useFinancialHealthAuditController";

export function EditorialReportView({
  report,
  path,
  capturedEmail,
  capturedFirstName,
  titleRef,
}: Omit<ReportViewProps, "report"> & { report: EditorialAuditReport }) {
  // Reason: Older persisted reports expose the same ordered six findings as
  // two three-item arrays. The lead gate now happens before generation, so the
  // renderer joins both transport shapes into one uninterrupted carousel.
  const findings = report.additionalFindings?.length
    ? [...report.findings, ...report.additionalFindings]
    : report.findings;
  const findingSlides = getEditorialFindingSlides(findings);
  const actionGroups = [
    { title: "This week", actions: report.actionPlan.thisWeek },
    { title: "This quarter", actions: report.actionPlan.thisQuarter },
  ];
  const reliabilityAreas = report.reliabilityAreas ?? [];
  const auditSnapshotDate = formatAuditSnapshotDate(report.asOfDate);

  const bookDemo = () => {
    track("financial_health_audit_cta_clicked", {
      path: path ?? "unknown",
      surface: "editorial_demo",
    });

    // Reason: Same Michael event as the homepage demo. The audit used to
    // open Daniel's leftover 30-minute calendar from a second hardcoded URL.
    const calendlyUrl = new URL(PORTER_DEMO_CALENDLY_URL);
    if (capturedFirstName?.trim()) calendlyUrl.searchParams.set("name", capturedFirstName.trim());
    if (capturedEmail?.trim()) calendlyUrl.searchParams.set("email", capturedEmail.trim().toLowerCase());
    calendlyUrl.searchParams.set("utm_source", "porter");
    calendlyUrl.searchParams.set("utm_medium", "website");
    calendlyUrl.searchParams.set("utm_campaign", "financial_health_audit");

    void openCalendlyPopup(calendlyUrl.toString());
  };

  return (
    <article className="fha-editorial-report">
      <header className="fha-editorial-hero">
        <div className="fha-editorial-container">
          <div className="fha-editorial-meta">
            <span>Financial health audit</span>
            <span>{report.reviewPeriod}</span>
            {/* Reason: The last surviving copy-rewriting helper on this page. Appending
                " basis" only reads correctly when the field holds a bare word like
                "accrual"; the output schema asks for a source label, so a real report
                rendered "Accrual basis; owner-uploaded summary document, no ledger or
                bank data basis" (live audit 659cbdd0, 2026-08-31). Authored text is
                displayed verbatim here like every other field. sourceLabel stays for
                legacy V1 reports that carry no reportingBasis at all. */}
            <span>{report.reportingBasis || sourceLabel(path)}</span>
          </div>
          <div className="fha-editorial-hero__copy">
            <p className="fha-editorial-section-mark">Audit complete</p>
            <h1 ref={titleRef} tabIndex={-1}>{renderNumericCopy(report.headline)}</h1>
            <p className="fha-editorial-summary">{renderNumericCopy(report.summary)}</p>
          </div>
        </div>
      </header>

      <EditorialFindingCarousel
        slides={findingSlides}
        sectionId="insights"
        eyebrow="Findings"
        title="What deserves your attention"
      />

      <section className="fha-editorial-actions" aria-labelledby="fha-editorial-actions-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">Next moves</p>
              <h2 id="fha-editorial-actions-title">What to do next</h2>
            </div>
          </div>
          <div className="fha-editorial-action-groups">
            {actionGroups.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h3>{group.title}</h3>
                <ol>
                  {group.actions.map((action, index) => (
                    <li key={`${group.title}-${action.title}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h4>{action.title}</h4>
                        <p>{renderNumericCopy(action.body)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="fha-editorial-reliability" aria-labelledby="fha-editorial-reliability-title">
        <div className="fha-editorial-container">
          <div className="fha-editorial-section-head">
            <div>
              <p className="fha-editorial-section-mark">How much to trust</p>
              <h2 id="fha-editorial-reliability-title">How much to trust this</h2>
            </div>
          </div>
          <p className="fha-editorial-reliability__note">{renderNumericCopy(report.reliabilityNote ?? "")}</p>
          {reliabilityAreas.length ? (
            <dl>
              {reliabilityAreas.map((area) => (
                <div key={area.label} className={`is-${area.status}`}>
                  <dt>{area.label}</dt>
                  <dd>{renderNumericCopy(area.note)}</dd>
                  <span aria-label={area.status}>{area.status}</span>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <footer className="fha-editorial-close">
        <div className="fha-editorial-container">
          <div>
            <p className="fha-editorial-section-mark">Your next step</p>
            <h2>Walk through these findings on your live books with us.</h2>
            <p>30 minutes, and you leave with a fix plan.</p>
            <div className="fha-editorial-close__buttons">
              {/* Reason: A completed audit is the immutable recovery target for
                  this email. Offering another run here would contradict the
                  Generate-to-recovery flow and create a duplicate report. */}
              <button type="button" className="fha-button fha-button--primary fha-button--large" onClick={bookDemo}>Walk through my findings</button>
            </div>
          </div>
          <p className="fha-editorial-close__snapshot">
            These numbers are from {auditSnapshotDate}. Your books have already changed. Porter watches them every day.
          </p>
        </div>
      </footer>
    </article>
  );
}
