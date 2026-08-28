// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditReport, NarratedFinding } from "./financialHealthAuditFlow";
import { FinancialHealthAudit } from "./FinancialHealthAudit";

const STORAGE_KEY = "porter-financial-health-audit-v2";

beforeEach(() => {
  // Reason: The page scrolls to each hydrated step, while jsdom intentionally
  // omits visual scrolling. Stub only that browser surface for focused tests.
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  // Reason: Every case exercises hydration from the real browser boundary, so
  // stored report state must not leak between finding-count variants.
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

// Reason: These compact builders isolate finding-count behavior while the
// component test still exercises the production storage guard and renderer.
function finding(index: number, locked: boolean): NarratedFinding {
  return {
    checkId: `check-${index}`,
    stat: `${index}`,
    verdict: "fact",
    title: `Finding ${index}`,
    body: "Grounded finding body.",
    fixNote: "Confirm the source.",
    tiedTo: null,
    locked,
  };
}

function report(
  primaryCount: number,
  additionalCount: number,
  options: { omitAdditional?: boolean } = {},
): AuditReport {
  const value: AuditReport = {
    version: 2,
    eyebrow: "Audit complete",
    title: "Financial health audit",
    lede: "Grounded financial findings.",
    analysisSummary: "Grounded financial findings.",
    findings: Array.from({ length: primaryCount }, (_, index) => finding(index + 1, false)),
    additionalFindings: Array.from(
      { length: additionalCount },
      (_, index) => finding(primaryCount + index + 1, true),
    ),
    confidenceTitle: "Source confidence",
    confidenceBody: "Based on the supplied records.",
    actions: [],
    headline: "Adaptive evidence report",
    reviewPeriod: "January 2026",
    summary: "The supplied records support this report.",
    actionPlan: {
      thisWeek: [{ title: "Confirm the source", body: "Review the supplied records." }],
      thisQuarter: [{ title: "Repeat the review", body: "Keep the source current." }],
    },
    reliabilityNote: "Review the supplied source records.",
    isSample: false,
  };
  if (options.omitAdditional) delete value.additionalFindings;
  return value;
}

async function renderStoredReport(value: AuditReport, path: "documents" | "connected") {
  // Reason: Hydration is the exact boundary that previously discarded any V2
  // report that was not grouped as three visible plus three additional findings.
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    stepId: path === "documents" ? "complete-d" : "complete-c",
    path,
    answers: { connection_choice: path === "documents" ? "documents" : "quickbooks" },
    auditId: "audit-id",
    auditToken: "audit-token",
    companyName: null,
    report: value,
    capturedEmail: null,
    capturedFirstName: null,
  }));
  renderAudit();
  await screen.findByRole("heading", { name: "Adaptive evidence report" });
}

function renderAudit() {
  // Reason: The production app supplies this document-head context above every
  // route. Include the same boundary so the focused test exercises the page.
  return render(
    <HelmetProvider>
      <FinancialHealthAudit />
    </HelmetProvider>,
  );
}

describe("financial health audit report finding counts", () => {
  it("keeps the lead gate neutral about the eventual finding count", async () => {
    // Reason: The report count is not known before document narration, so lead
    // capture must not keep the retired six-finding promise in visible or a11y copy.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      stepId: "lead-capture",
      path: "documents",
      // Reason: Hydration resumes at the first unanswered required step, so this
      // fixture must represent a visitor who legitimately reached lead capture.
      answers: {
        business_type: "Professional services",
        connection_choice: "documents",
        audit_goals: ["Find cost-saving opportunities"],
        revenue_pattern: "Pretty steady",
        biggest_cash_plan: "Nothing big planned",
        books_confidence: "Mostly confident: a few things may be off",
      },
    }));
    renderAudit();

    expect(await screen.findByRole("heading", { name: "Your report is ready to build." })).toBeTruthy();
    expect(screen.getByLabelText("Your report will be sized to the available financial evidence")).toBeTruthy();
    expect(screen.queryByText("06")).toBeNull();
    expect(screen.queryByText(/six findings/i)).toBeNull();
  });

  it("renders a shorter document report without a second email gate", async () => {
    // Reason: Sparse grounded documents should show their supported findings and
    // action plan instead of being rejected or asking for another email unlock.
    await renderStoredReport(report(2, 0), "documents");

    expect(screen.getByText("01 of 02")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What to do next" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull();
  });

  it("preserves the grouped three plus three QuickBooks report", async () => {
    // Reason: Adaptive document counts must not change the existing rich report
    // shape emitted for QuickBooks-backed audits.
    await renderStoredReport(report(3, 3), "connected");

    expect(screen.getByText("01 of 06")).toBeTruthy();
    expect(screen.getByText("QuickBooks connected")).toBeTruthy();
  });

  it("preserves the legacy flat six-finding report", async () => {
    // Reason: Browsers may still hold the former flat transport in session
    // storage, so that compatibility branch remains intentionally narrow.
    await renderStoredReport(report(6, 0, { omitAdditional: true }), "connected");

    expect(screen.getByText("01 of 06")).toBeTruthy();
  });

  it("rejects empty and oversized grouped reports", async () => {
    // Reason: Variable does not mean unbounded. Invalid persisted reports must
    // fall back to intake rather than rendering an empty or oversized audit.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      stepId: "complete-d",
      path: "documents",
      answers: { connection_choice: "documents" },
      report: report(0, 0),
    }));
    const { unmount } = renderAudit();
    expect(await screen.findByRole("heading", { name: "What kind of business is this?" })).toBeTruthy();
    unmount();

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      stepId: "complete-d",
      path: "documents",
      answers: { connection_choice: "documents" },
      report: report(3, 4),
    }));
    renderAudit();
    expect(await screen.findByRole("heading", { name: "What kind of business is this?" })).toBeTruthy();
  });
});
