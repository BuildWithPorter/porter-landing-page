// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FinancialHealthAudit } from "./FinancialHealthAudit";
import { openCalendlyPopup, PORTER_DEMO_CALENDLY_URL } from "../lib/calendly";
import * as api from "../services/financialHealthAudit";
import { FinancialHealthAuditRequestError } from "../services/financialHealthAuditError";
import { FLOWS, STEPS } from "./financialHealthAuditFlow";
import {
  useFinancialHealthAuditController,
  type AuditBrowserPort,
} from "./useFinancialHealthAuditController";

vi.mock("../components/Seo", () => ({ Seo: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("../lib/calendly", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/calendly")>();
  return { ...actual, openCalendlyPopup: vi.fn() };
});
vi.mock("../services/financialHealthAudit", () => ({
  createFinancialHealthAudit: vi.fn(),
  getFinancialHealthAudit: vi.fn(),
  updateFinancialHealthAudit: vi.fn(),
  captureFinancialHealthAuditEmail: vi.fn(),
  requestFinancialHealthAuditRecovery: vi.fn(),
  startFinancialHealthAuditEmailRecovery: vi.fn(),
  startFinancialHealthQuickBooksConnection: vi.fn(),
  generateFinancialHealthAudit: vi.fn(),
  listFinancialHealthAuditDocuments: vi.fn(),
  notifyFinancialHealthAuditReportStarted: vi.fn(),
  preflightFinancialHealthAuditDocuments: vi.fn(),
  uploadFinancialHealthAuditDocument: vi.fn(),
  verifyFinancialHealthAuditEmailRecovery: vi.fn(),
  waitForFinancialHealthAudit: vi.fn(),
  waitForFinancialHealthAuditDocuments: vi.fn(),
  waitForFinancialHealthQuickBooksConnection: vi.fn(),
}));

const remote = {
  id: "audit-id", accessToken: "secret", status: "in_progress" as const,
  report: null, capturedEmail: "owner@example.com", capturedFirstName: "Owner",
};

function ControllerHarness({ browser }: { browser: AuditBrowserPort }) {
  const controller = useFinancialHealthAuditController(browser);
  return (
    <button
      type="button"
      disabled={controller.screen === "boot"}
      onClick={controller.actions.startQuickBooks}
    >
      Start QuickBooks
    </button>
  );
}

async function renderHydratedAudit() {
  render(<FinancialHealthAudit />);
  // Reason: Hydration focuses the heading; typing before that effect runs
  // races focus and can send the first-name keystrokes to the heading in jsdom.
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", {
    name: "Keep your audit private and easy to return to.",
  })));
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/financial-health-audit");
  vi.stubGlobal("scrollTo", vi.fn());
  // Reason: The waiting view animates text with browser layout observation;
  // jsdom has no layout engine, while these tests exercise recovery behavior.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.mocked(api.createFinancialHealthAudit).mockResolvedValue(remote);
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(remote);
  vi.mocked(api.updateFinancialHealthAudit).mockResolvedValue(remote);
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: false });
  vi.mocked(api.requestFinancialHealthAuditRecovery).mockResolvedValue({ state: "recovery-state" });
  vi.mocked(api.notifyFinancialHealthAuditReportStarted).mockResolvedValue(undefined);
  vi.mocked(api.listFinancialHealthAuditDocuments).mockResolvedValue([]);
  vi.mocked(api.startFinancialHealthQuickBooksConnection).mockResolvedValue({ authUrl: null });
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockResolvedValue({
    status: "connected",
    companyName: "Company",
    connectedAt: "2026-08-31",
    errorMessage: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("renders saved financial claims verbatim without rounding or added promises", async () => {
  // Reason: Display-time humanization changed ratios, aging qualifiers and
  // periods. Exercise hydration and all report slots, not just a text helper.
  const finding = {
    checkId: "B2_zero_income_months", stat: "Net margin 16.7%; cash $0.25; current ratio 0.42x",
    verdict: "fact", title: "42% of receivables are over 30 days overdue",
    body: "Net margin rose 16.7% → 27.9% in the review period. Café costs $1.25.",
    fixNote: "Review A/R for May–Jul 2026.", tiedTo: null, locked: false,
  };
  const report = {
    version: 2, eyebrow: "Audit complete", title: "Report", lede: "Report",
    confidenceTitle: "", confidenceBody: "", actions: [], isSample: false,
    headline: "Receivables collections — a qualified view",
    summary: "Current ratio 0.42x; 58.3% past due, 41.7% over 30 days overdue.",
    reviewPeriod: "May–Jul 2026", asOfDate: "2026-07-31",
    findings: [finding, { ...finding, checkId: "f2" }, { ...finding, checkId: "f3" }],
    additionalFindings: [4, 5, 6].map((n) => ({ ...finding, checkId: `f${n}` })),
    actionPlan: {
      thisWeek: [{ title: "Review receivables", body: "Confirm $0.25 and 0.42x." }],
      thisQuarter: [{ title: "Check the review period", body: String.raw`Keep the literal reference \u2192 unchanged.` }],
    },
    reliabilityNote: "Balances do not establish future liquidity.",
  };
  const stored = { stepId: "complete-d", path: "documents", answers: {}, auditId: "saved",
    auditToken: null, companyName: "Test", capturedEmail: remote.capturedEmail,
    capturedFirstName: "Owner", report };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(stored));
  const { container, unmount } = render(<FinancialHealthAudit />);
  await screen.findByRole("heading", { name: report.headline });
  const assertText = (selector: string, expected: string) => {
    expect(container.querySelector(selector)?.textContent).toBe(expected);
  };
  assertText(".fha-editorial-summary", report.summary);
  assertText(".fha-editorial-finding-slide strong", finding.stat);
  assertText(".fha-editorial-finding-slide h3", finding.title);
  assertText(".fha-editorial-finding-slide > p", finding.body);
  assertText(".fha-editorial-finding-fix p", finding.fixNote);
  expect(screen.getByText("Review receivables")).toBeTruthy();
  expect(container.textContent).not.toContain("Porter does this for you.");
  expect(container.textContent).toContain(report.actionPlan.thisQuarter[0].body);
  expect([...container.querySelectorAll(".fha-number")].map((node) => node.textContent)).toContain("$0.25");
  expect(JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!).report).toEqual(report);
  unmount();
  render(<FinancialHealthAudit />);
  await screen.findByRole("heading", { name: report.headline });
  expect(screen.getAllByText(finding.title).length).toBeGreaterThan(0);
});

it("opens Michael's Calendly from the completed-report walkthrough", async () => {
  // Reason: The audit used to book Daniel's leftover event. A completed report
  // must open the same Michael calendar as the homepage demo button.
  const finding = {
    checkId: "B2_zero_income_months", stat: "Net margin 16.7%",
    verdict: "fact", title: "Collections need attention",
    body: "Follow up on overdue invoices.",
    fixNote: "Review A/R.", tiedTo: null, locked: false,
  };
  const report = {
    version: 2, eyebrow: "Audit complete", title: "Report", lede: "Report",
    confidenceTitle: "", confidenceBody: "", actions: [], isSample: false,
    headline: "Receivables collections — a qualified view",
    summary: "Current ratio 0.42x.",
    reviewPeriod: "May–Jul 2026", asOfDate: "2026-07-31",
    findings: [finding, { ...finding, checkId: "f2" }, { ...finding, checkId: "f3" }],
    additionalFindings: [4, 5, 6].map((n) => ({ ...finding, checkId: `f${n}` })),
    actionPlan: {
      thisWeek: [{ title: "Review receivables", body: "Confirm aging." }],
      thisQuarter: [{ title: "Check the review period", body: "Keep the period." }],
    },
    reliabilityNote: "Balances do not establish future liquidity.",
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify({
    stepId: "complete-d", path: "documents", answers: {}, auditId: "saved",
    auditToken: null, companyName: "Test", capturedEmail: remote.capturedEmail,
    capturedFirstName: "Owner", report,
  }));
  const user = userEvent.setup();
  render(<FinancialHealthAudit />);
  await screen.findByRole("heading", { name: report.headline });
  await user.click(screen.getByRole("button", { name: "Walk through my findings" }));
  expect(vi.mocked(openCalendlyPopup)).toHaveBeenCalledOnce();
  const calendlyUrl = new URL(String(vi.mocked(openCalendlyPopup).mock.calls[0]?.[0]));
  expect(`${calendlyUrl.origin}${calendlyUrl.pathname}`).toBe(PORTER_DEMO_CALENDLY_URL);
  expect(calendlyUrl.searchParams.get("name")).toBe("Owner");
  expect(calendlyUrl.searchParams.get("email")).toBe("owner@example.com");
  expect(calendlyUrl.searchParams.get("utm_campaign")).toBe("financial_health_audit");
});

it("captures email before creating a company or exposing financial-data intake", async () => {
  // Reason: An anonymous visit is not permission to persist a contact-less
  // company. The existing form moves forward; there is no additional auth step.
  const user = userEvent.setup();
  await renderHydratedAudit();
  await screen.findByRole("heading", { name: "Keep your audit private and easy to return to." });
  expect(api.createFinancialHealthAudit).not.toHaveBeenCalled();
  expect(screen.queryByText("Upload documents")).toBeNull();
  expect(screen.queryByText("Verify my email")).toBeNull();
  expect(screen.getByText(/No account or password needed/)).toBeTruthy();
  expect(screen.getByText(/audit updates and helpful follow-ups/)).toBeTruthy();
  await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(api.createFinancialHealthAudit).toHaveBeenCalledOnce());
  expect(vi.mocked(api.createFinancialHealthAudit).mock.calls[0][0]).toMatchObject({
    capturedEmail: "owner@example.com", answers: {}, auditId: null, auditToken: null,
  });
  await waitFor(() => expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull());
  // Reason: A previously unseen email must stay on its newly-created isolated
  // audit instead of entering recovery or inheriting another email's company.
  expect(api.requestFinancialHealthAuditRecovery).not.toHaveBeenCalled();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  expect(api.startFinancialHealthAuditEmailRecovery).not.toHaveBeenCalled();
});

it("persists the server-captured email when explicit capture needs a retry", async () => {
  // Reason: Dev hit a stale-session 409 after create saved an email server-side
  // but the browser only persisted the returned bearer. If the next call or page
  // lifecycle is interrupted, the browser must not later reuse that bearer with a
  // blank/different email and trip the backend set-once privacy guard.
  vi.mocked(api.captureFinancialHealthAuditEmail).mockRejectedValueOnce(new Error("Retry capture"));
  const user = userEvent.setup();
  await renderHydratedAudit();

  await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await screen.findByRole("alert");
  await waitFor(() => {
    const saved = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
    expect(saved.auditId).toBe(remote.id);
    expect(saved.auditToken).toBe(remote.accessToken);
    expect(saved.capturedEmail).toBe("owner@example.com");
  });
});

it("rehydrates a bearer-only saved audit from the server after refresh", async () => {
  // Reason: An older deployed bundle could retain the audit bearer without the
  // email already captured by Porter. Refresh must resume that audit instead of
  // reopening the lead gate and conflicting with its set-once email identity.
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify({
    stepId: "business-type",
    path: null,
    answers: {},
    auditId: "saved-audit",
    auditToken: "saved-bearer-token-that-is-long-enough",
    companyName: null,
    report: null,
    capturedEmail: null,
    capturedFirstName: null,
  }));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...remote,
    id: "saved-audit",
    stepId: "connect",
    path: null,
    answers: { business_type: "Professional services" },
  });

  render(<FinancialHealthAudit />);

  await waitFor(() => expect(api.getFinancialHealthAudit).toHaveBeenCalledWith(
    "saved-audit",
    "saved-bearer-token-that-is-long-enough",
    expect.any(AbortSignal),
  ));
  await screen.findByRole("heading", { name: STEPS.connect.title });
  expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
  const saved = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(saved.capturedEmail).toBe(remote.capturedEmail);
  expect(saved.stepId).toBe("connect");
  expect(saved.answers.business_type).toBe("Professional services");
});

it("requires email proof before opening previously saved work", async () => {
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  const user = userEvent.setup();
  await renderHydratedAudit();
  await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText("Your saved audit is here");
  expect(screen.getByRole("button", { name: "Verify my email" })).toBeTruthy();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
});

it("installs the latest completed report returned after email proof", async () => {
  // Reason: Email identifies a history of audits, so the browser must render the
  // backend-selected latest report rather than retaining the newly-created shell.
  const finding = {
    checkId: "latest-finding",
    stat: "$42K cash",
    verdict: "fact" as const,
    title: "Latest saved finding",
    body: "This finding belongs to the latest saved report.",
    fixNote: "Review the latest period.",
    tiedTo: null,
    locked: false,
  };
  const report = {
    version: 2 as const,
    eyebrow: "Audit complete",
    title: "Latest saved report",
    lede: "Latest saved report",
    confidenceTitle: "",
    confidenceBody: "",
    actions: [],
    isSample: false,
    headline: "Your latest saved audit",
    reviewPeriod: "June–August 2026",
    summary: "This is the latest report selected for the verified email.",
    findings: [finding, { ...finding, checkId: "latest-2" }, { ...finding, checkId: "latest-3" }],
    additionalFindings: [4, 5, 6].map((number) => ({ ...finding, checkId: `latest-${number}` })),
    actionPlan: { thisWeek: [], thisQuarter: [] },
    reliabilityNote: "This report reflects the latest saved evidence.",
  };
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockResolvedValue({
    id: "latest-saved-audit",
    path: "unconnected",
    report,
    capturedEmail: remote.capturedEmail,
    capturedFirstName: remote.capturedFirstName,
  });
  const user = userEvent.setup();
  await renderHydratedAudit();

  await user.type(screen.getByRole("textbox", { name: "Email" }), remote.capturedEmail);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Verify my email" }));
  await user.type(await screen.findByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));

  await screen.findByRole("heading", { name: report.headline });
  expect(document.body.textContent).toContain(report.summary);
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(persisted.auditId).toBe("latest-saved-audit");
  expect(persisted.report.headline).toBe(report.headline);
});

it("discards a stale recovery conflict and can request a fresh code", async () => {
  // Reason: Concurrent tabs can race bearer rotation. The losing tab must not
  // keep retrying its stale challenge or newly-created shell, but the owner
  // should be able to continue immediately with the same prefilled email.
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockRejectedValue(new FinancialHealthAuditRequestError(
    "The saved audit changed during recovery.",
    409,
    "AUDIT_RECOVERY_CONFLICT",
    { retryable: true },
  ));
  const user = userEvent.setup();
  await renderHydratedAudit();

  await user.type(screen.getByRole("textbox", { name: "Email" }), remote.capturedEmail);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Verify my email" }));
  await user.type(await screen.findByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));

  await screen.findByRole("heading", { name: "Keep your audit private and easy to return to." });
  expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value)
    .toBe(remote.capturedEmail);
  expect(screen.getByRole("alert").textContent).toMatch(/fresh code/i);
  expect(window.sessionStorage.getItem("porter-financial-health-audit-recovery")).toBeNull();
  expect(window.sessionStorage.getItem("porter-financial-health-audit-v2")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText("Your saved audit is here");
  expect(api.createFinancialHealthAudit).toHaveBeenCalledTimes(2);
  expect(api.requestFinancialHealthAuditRecovery).toHaveBeenCalledTimes(2);
});

it("starts a new audit before accepting a different recovery email", async () => {
  const firstAudit = {
    ...remote,
    id: "email-bound-audit",
    accessToken: "first-secret",
  };
  const secondAudit = {
    ...remote,
    id: "new-audit",
    accessToken: "second-secret",
    capturedEmail: "other@example.com",
  };
  vi.mocked(api.createFinancialHealthAudit)
    .mockResolvedValueOnce(firstAudit)
    .mockResolvedValueOnce(secondAudit);
  vi.mocked(api.captureFinancialHealthAuditEmail)
    .mockResolvedValueOnce({ ...firstAudit, recoveryAvailable: true })
    .mockResolvedValueOnce({ ...secondAudit, recoveryAvailable: false });
  vi.mocked(api.updateFinancialHealthAudit).mockResolvedValue(secondAudit);
  const user = userEvent.setup();
  await renderHydratedAudit();

  await user.type(screen.getByRole("textbox", { name: "Email" }), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText("Your saved audit is here");
  await user.click(screen.getByRole("button", { name: "Use a different email" }));

  const email = await screen.findByRole("textbox", { name: "Email" });
  expect((email as HTMLInputElement).value).toBe("");
  await user.type(email, "other@example.com");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await screen.findByRole("heading", { name: STEPS["business-type"].title });
  expect(api.createFinancialHealthAudit).toHaveBeenCalledTimes(2);
  expect(vi.mocked(api.createFinancialHealthAudit).mock.calls[1][0]).toMatchObject({
    capturedEmail: "other@example.com",
    auditId: null,
    auditToken: null,
  });
  expect(api.captureFinancialHealthAuditEmail).toHaveBeenLastCalledWith(
    "new-audit",
    "second-secret",
    "other@example.com",
  );
  const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(persisted.auditId).toBe("new-audit");
});

it("polls a generating recovered report without restarting QuickBooks or generation", async () => {
  // Reason (POR-2452): Installing recovered credentials used to PATCH/generate
  // again. A live generating checkup 409s that save; poll it instead.
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockResolvedValue({
    id: "saved-audit", path: "connected", report: null,
    capturedEmail: remote.capturedEmail, capturedFirstName: remote.capturedFirstName,
    session: { ...remote, id: "saved-audit", accessToken: "rotated-secret", status: "generating",
      stepId: "complete-c", path: "connected", answers: Object.fromEntries(
        FLOWS.connected.flatMap((step) => (STEPS[step].fields ?? [])
          .filter((field) => field.options?.length)
          .map((field) => [field.name, field.type === "multi" ? [field.options![0].label] : field.options![0].label])),
      ) },
  });
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...remote, id: "saved-audit", status: "generating",
  });
  vi.mocked(api.waitForFinancialHealthAudit).mockImplementation(() => new Promise(() => undefined));
  const user = userEvent.setup();
  await renderHydratedAudit();
  await user.type(screen.getByRole("textbox", { name: "Email" }), remote.capturedEmail);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Verify my email" }));
  expect(screen.getByText(/Delivery can take up to a minute\./)).toBeTruthy();
  await user.type(await screen.findByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));
  await waitFor(() => expect(api.waitForFinancialHealthAudit).toHaveBeenCalledWith(
    "saved-audit",
    "rotated-secret",
    expect.any(AbortSignal),
    expect.any(Function),
  ));
  const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(persisted.auditId).toBe("saved-audit");
  expect(persisted.auditToken).toBe("rotated-secret");
  expect(window.sessionStorage.getItem("porter-financial-health-audit-recovery")).toBeNull();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
  expect(api.createFinancialHealthAudit).toHaveBeenCalledOnce();
  expect(document.body.textContent).not.toContain("Your report did not finish");
  expect(document.body.textContent).not.toContain("≈1:00");
  expect(document.body.textContent).toMatch(/\d+:\d{2} elapsed/);
});

it("retries a failed recovered report with the rotated bearer", async () => {
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockResolvedValue({
    id: "saved-audit", path: "connected", report: null,
    capturedEmail: remote.capturedEmail, capturedFirstName: remote.capturedFirstName,
    session: { ...remote, id: "saved-audit", accessToken: "rotated-secret", status: "failed",
      stepId: "complete-c", path: "connected", answers: Object.fromEntries(
        FLOWS.connected.flatMap((step) => (STEPS[step].fields ?? [])
          .filter((field) => field.options?.length)
          .map((field) => [field.name, field.type === "multi" ? [field.options![0].label] : field.options![0].label])),
      ) },
  });
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...remote, id: "saved-audit", status: "failed",
  });
  vi.mocked(api.generateFinancialHealthAudit).mockResolvedValue({ ...remote, status: "generating" });
  vi.mocked(api.waitForFinancialHealthAudit).mockImplementation(() => new Promise(() => undefined));
  const user = userEvent.setup();
  await renderHydratedAudit();
  await user.type(screen.getByRole("textbox", { name: "Email" }), remote.capturedEmail);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Verify my email" }));
  await user.type(await screen.findByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));
  await waitFor(() => expect(api.generateFinancialHealthAudit).toHaveBeenCalledWith("saved-audit", "rotated-secret"));
  expect(api.waitForFinancialHealthAudit).toHaveBeenCalledWith("saved-audit", "rotated-secret", expect.any(AbortSignal), expect.any(Function));
  expect(api.waitForFinancialHealthQuickBooksConnection).toHaveBeenCalledWith("saved-audit", "rotated-secret", expect.any(AbortSignal));
  expect(vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mock.invocationCallOrder[0])
    .toBeLessThan(vi.mocked(api.generateFinancialHealthAudit).mock.invocationCallOrder[0]);
});

it("polls a generating saved audit instead of treating a locked save as failure", async () => {
  const answers = Object.fromEntries(
    FLOWS.connected.flatMap((stepId) => (STEPS[stepId].fields ?? [])
      .filter((field) => field.options?.length)
      .map((field) => [
        field.name,
        field.type === "multi" ? [field.options![0].label] : field.options![0].label,
      ])),
  );
  const saved = {
    ...remote,
    stepId: "complete-c",
    path: "connected" as const,
    answers,
    auditId: "audit-id",
    auditToken: "secret",
    companyName: "Dela Rosa Home Services",
    connectionStatus: "connected" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...saved,
    status: "generating",
    generationActivity: "Reading the ledger",
  });
  vi.mocked(api.updateFinancialHealthAudit).mockRejectedValue(
    new FinancialHealthAuditRequestError(
      "This audit can no longer be edited.",
      409,
      "conflict",
      { reason: "generation_in_progress" },
    ),
  );
  vi.mocked(api.waitForFinancialHealthAudit).mockImplementation(() => new Promise(() => undefined));

  render(<FinancialHealthAudit />);

  await waitFor(() => expect(api.waitForFinancialHealthAudit).toHaveBeenCalledWith(
    "audit-id",
    "secret",
    expect.any(AbortSignal),
    expect.any(Function),
  ));
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  expect(api.updateFinancialHealthAudit).not.toHaveBeenCalled();
  expect(document.body.textContent).not.toContain("Your report did not finish");
  expect(document.body.textContent).toMatch(/\d+:\d{2} elapsed/);
});

it("continues a verified connected audit past the QuickBooks chooser", async () => {
  // Reason: The API intentionally persists `stepId=connect` while QBO owns the
  // handoff. Email recovery installs that session directly, so the combined
  // recovery + connected state must advance without asking to reconnect.
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockResolvedValue({
    id: "saved-audit",
    path: "connected",
    report: null,
    capturedEmail: remote.capturedEmail,
    capturedFirstName: remote.capturedFirstName,
    session: {
      ...remote,
      id: "saved-audit",
      accessToken: "rotated-secret",
      stepId: "connect",
      path: "connected",
      answers: {
        business_type: "Professional services",
        connection_choice: "quickbooks",
      },
      connectionStatus: "connected",
      qboCompanyName: "Audit Company",
    },
  });
  const user = userEvent.setup();
  await renderHydratedAudit();

  await user.type(screen.getByRole("textbox", { name: "Email" }), remote.capturedEmail);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(await screen.findByRole("button", { name: "Verify my email" }));
  await user.type(await screen.findByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("QuickBooks ready");
  expect(api.startFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
  const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(persisted.stepId).toBe("goal");
});

it("routes a stale pre-recovery tab back through email proof", async () => {
  // Reason: Email verification rotates the audit bearer. Another open tab then
  // receives the deliberately masked 404 from QBO status; that is stale access,
  // not evidence that the audit vanished or its report failed.
  const answers = Object.fromEntries(
    FLOWS.connected.flatMap((stepId) => (STEPS[stepId].fields ?? [])
      .filter((field) => field.options?.length)
      .map((field) => [
        field.name,
        field.type === "multi" ? [field.options![0].label] : field.options![0].label,
      ])),
  );
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify({
    stepId: "complete-c",
    path: "connected",
    answers,
    auditId: "saved-audit",
    auditToken: "stale-bearer-token-that-is-long-enough",
    companyName: null,
    report: null,
    capturedEmail: remote.capturedEmail,
    capturedFirstName: remote.capturedFirstName,
    connectionStatus: "pending",
  }));
  const staleAccess = new FinancialHealthAuditRequestError(
    "Financial health audit with ID 'saved-audit' not found",
    404,
  );
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockRejectedValue(staleAccess);
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({
    ...remote,
    id: "recovery-shell",
    accessToken: "new-shell-secret",
    recoveryAvailable: true,
  });
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: "Keep your audit private and easy to return to." });
  const email = screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement;
  expect(email.value).toBe(remote.capturedEmail);
  expect(screen.getByRole("alert").textContent).toContain("Verify your email to reopen your audit");
  expect(document.body.textContent).not.toContain("Your report did not finish");
  expect(document.body.textContent).not.toContain("Financial health audit with ID");
  expect(window.sessionStorage.getItem("porter-financial-health-audit-v2")).toBeNull();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByText("Your saved audit is here");
  expect(api.createFinancialHealthAudit).toHaveBeenCalledWith(expect.objectContaining({
    auditId: null,
    auditToken: null,
    capturedEmail: remote.capturedEmail,
  }));
});

it("offers QuickBooks recovery instead of retrying a report that cannot start", async () => {
  const answers = Object.fromEntries(
    FLOWS.connected.flatMap((stepId) => (STEPS[stepId].fields ?? [])
      .filter((field) => field.options?.length)
      .map((field) => [
        field.name,
        field.type === "multi" ? [field.options![0].label] : field.options![0].label,
      ])),
  );
  const saved = {
    ...remote,
    stepId: "complete-c",
    path: "connected" as const,
    answers,
    auditId: "audit-id",
    auditToken: "secret",
    companyName: null,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockRejectedValue(
    new Error("These QuickBooks books are already connected to a Porter workspace."),
  );
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: "QuickBooks import stopped." });
  expect(screen.getByRole("alert").textContent).toContain("already connected");
  expect(screen.getByRole("button", { name: "Sign in to Porter" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start new audit" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Generate report" })).toBeNull();

  await user.click(screen.getByRole("button", { name: "Reconnect QuickBooks" }));
  await waitFor(() => expect(api.startFinancialHealthQuickBooksConnection).toHaveBeenCalledWith(
    "audit-id",
    "secret",
    "http://localhost:3000/financial-health-audit",
  ));
});

it("starts a clean audit from QuickBooks recovery", async () => {
  const saved = {
    ...remote,
    stepId: "complete-c",
    path: "connected" as const,
    answers: { connection_choice: "quickbooks" },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: "Existing Company",
    connectionStatus: "failed" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockRejectedValue(
    new Error("These QuickBooks books are already connected to a Porter workspace."),
  );
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: "QuickBooks import stopped." });
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already connected"));
  window.sessionStorage.setItem("porter-financial-health-audit-qbo-started-at", "123");
  window.sessionStorage.setItem("porter-financial-health-audit-recovery", JSON.stringify({
    state: "recovery-state-that-is-long-enough-for-storage",
    email: remote.capturedEmail,
  }));
  await user.click(screen.getByRole("button", { name: "Start new audit" }));

  await screen.findByRole("heading", { name: "Keep your audit private and easy to return to." });
  expect((screen.getByRole("textbox", { name: "Email" }) as HTMLInputElement).value).toBe("");
  expect(window.sessionStorage.getItem("porter-financial-health-audit-v2")).toBeNull();
  expect(window.sessionStorage.getItem("porter-financial-health-audit-qbo-started-at")).toBeNull();
  expect(window.sessionStorage.getItem("porter-financial-health-audit-recovery")).toBeNull();
});

it("surfaces an OAuth callback mismatch without replacing the active audit", async () => {
  const saved = {
    ...remote,
    id: "active-audit",
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    companyName: null,
    connectionStatus: "not_started" as const,
    quickBooksPhase: "authorizing" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  window.sessionStorage.setItem("porter-financial-health-audit-qbo-started-at", "123");
  window.history.replaceState(
    {},
    "",
    "/financial-health-audit?quickbooks=processing&audit_id=different-audit",
  );
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.updateFinancialHealthAudit).mockResolvedValue(saved);
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);

  await screen.findByText("QuickBooks returned for a different audit. Reconnect it from this audit and try again.");
  expect(window.location.search).toBe("");
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
  expect(window.sessionStorage.getItem("porter-financial-health-audit-qbo-started-at")).toBeNull();
  const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(persisted.auditId).toBe("active-audit");
  expect(persisted.path).toBe("connected");
  expect(persisted.answers.connection_choice).toBe("quickbooks");
  expect(persisted.quickBooksPhase).toBe("authorizing");
  expect(persisted.callbackNotice).toContain("different audit");

  const retry = screen.getByRole("button", { name: /I use QuickBooks/ });
  expect((retry as HTMLButtonElement).disabled).toBe(false);
  await user.click(retry);
  await waitFor(() => expect(api.startFinancialHealthQuickBooksConnection).toHaveBeenCalledWith(
    "active-audit",
    "secret",
    "http://localhost:3000/financial-health-audit",
  ));
});

it("falls back to valid legacy storage when the current snapshot is malformed", async () => {
  const legacy = {
    ...remote,
    stepId: "business-type",
    path: null,
    answers: {},
    auditId: "legacy-audit",
    auditToken: "legacy-secret",
    connectionStatus: "not_started" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", "{");
  window.sessionStorage.setItem("porter-financial-health-audit-v1", JSON.stringify(legacy));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(legacy);

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS["business-type"].title });
  await waitFor(() => expect(window.sessionStorage.getItem("porter-financial-health-audit-v1")).toBeNull());
  const migrated = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
  expect(migrated.auditId).toBe("legacy-audit");
  expect(migrated.auditToken).toBe("legacy-secret");
});

it("ignores unknown callback statuses instead of treating them as OAuth failure", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    connectionStatus: "not_started" as const,
    quickBooksPhase: "authorizing" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  window.sessionStorage.setItem("porter-financial-health-audit-qbo-started-at", "123");
  window.history.replaceState({}, "", "/financial-health-audit?quickbooks=unexpected");
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.connect.title });
  expect(screen.getAllByText("Opening QuickBooks…").length).toBeGreaterThan(0);
  expect(screen.queryByText(/QuickBooks was not connected/)).toBeNull();
  expect(window.location.search).toBe("");
  expect(window.sessionStorage.getItem("porter-financial-health-audit-qbo-started-at")).toBe("123");
});

it("does not treat backend pending as a successful OAuth callback", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    connectionStatus: "not_started" as const,
    quickBooksPhase: "authorizing" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...saved,
    connectionStatus: "pending",
  });

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.connect.title });
  expect(screen.getAllByText("Opening QuickBooks…").length).toBeGreaterThan(0);
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
});

it("keeps an accepted OAuth error actionable when hydration returns stale QBO intent", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    connectionStatus: "not_started" as const,
    quickBooksPhase: "authorizing" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  window.sessionStorage.setItem("porter-financial-health-audit-qbo-started-at", "123");
  window.history.replaceState({}, "", "/financial-health-audit?quickbooks=error");
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...saved,
    connectionStatus: "pending",
  });

  const { unmount } = render(<FinancialHealthAudit />);

  await screen.findByText("QuickBooks was not connected. Try again or continue without it.");
  await waitFor(() => {
    const persisted = JSON.parse(window.sessionStorage.getItem("porter-financial-health-audit-v2")!);
    expect(persisted.path).toBeNull();
    expect(persisted.answers.connection_choice).toBeUndefined();
    expect(persisted.quickBooksPhase).toBe("authorization_failed");
  });
  expect(window.location.search).toBe("");
  expect((screen.getByRole("button", { name: /I use QuickBooks/ }) as HTMLButtonElement).disabled).toBe(false);

  unmount();
  render(<FinancialHealthAudit />);
  await screen.findByText("QuickBooks was not connected. Try again or continue without it.");
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
});

it("does not let a stale OAuth error downgrade a connected audit", async () => {
  const saved = {
    ...remote,
    id: "active-audit",
    stepId: "goal",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    companyName: "Audit Company",
    connectionStatus: "connected" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  window.history.replaceState(
    {},
    "",
    "/financial-health-audit?quickbooks=error&audit_id=active-audit",
  );
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("QuickBooks ready");
  expect(screen.queryByText(/QuickBooks was not connected/)).toBeNull();
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
  expect(window.location.search).toBe("");
});

it("monitors the import during the questionnaire and shows failures immediately", async () => {
  let rejectImport: (error: Error) => void = () => undefined;
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: null,
    connectionStatus: "pending" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  window.history.replaceState({}, "", "/financial-health-audit?quickbooks=processing&audit_id=audit-id");
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockImplementation(
    () => new Promise((_resolve, reject) => { rejectImport = reject; }),
  );

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("Importing QuickBooks");
  expect(api.waitForFinancialHealthQuickBooksConnection).toHaveBeenCalledWith(
    "audit-id",
    "secret",
    expect.any(AbortSignal),
  );
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  await waitFor(() => expect(window.location.search).toBe(""));

  rejectImport(new Error(
    "These QuickBooks books are already connected to a Porter workspace. "
    + "Sign in to Porter to use them, or reconnect and choose different books.",
  ));

  await screen.findByRole("heading", { name: "QuickBooks import stopped." });
  expect(screen.getByRole("alert").textContent).toContain("already connected to a Porter workspace");
  expect(screen.getByRole("button", { name: "Sign in to Porter" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reconnect QuickBooks" })).toBeTruthy();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
});

it("continues to the questions when QuickBooks resumes an existing import", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: null,
    answers: { business_type: "Professional services" },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: null,
    connectionStatus: "not_started" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.startFinancialHealthQuickBooksConnection).mockResolvedValue({ authUrl: null });
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockImplementation(
    () => new Promise(() => undefined),
  );
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.connect.title });
  await user.click(screen.getByRole("button", { name: /Connect live books/ }));

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("Importing QuickBooks");
  expect(document.body.textContent).not.toContain("Opening QuickBooks");
  expect(api.startFinancialHealthQuickBooksConnection).toHaveBeenCalledWith(
    "audit-id",
    "secret",
    "http://localhost:3000/financial-health-audit",
  );
});

it("does not leave for QuickBooks unless the OAuth handoff is durably stored", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: null,
    answers: { business_type: "Professional services" },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: null,
    connectionStatus: "not_started" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.startFinancialHealthQuickBooksConnection).mockResolvedValue({
    authUrl: "https://appcenter.intuit.com/connect/oauth2",
  });
  const originalSetItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function setItem(
    this: Storage,
    key: string,
    value: string,
  ) {
    if (
      key === "porter-financial-health-audit-v2" &&
      value.includes('"quickBooksPhase":"authorizing"')
    ) {
      throw new Error("Browser storage is unavailable. Try again.");
    }
    return originalSetItem.call(this, key, value);
  });
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);
  await screen.findByRole("heading", { name: STEPS.connect.title });
  await user.click(screen.getByRole("button", { name: /Connect live books/ }));

  await screen.findByText("Browser storage is unavailable. Try again.");
  expect(window.location.href).toBe("http://localhost:3000/financial-health-audit");
  expect(window.sessionStorage.getItem("porter-financial-health-audit-qbo-started-at")).toBeNull();
});

it("persists and verifies the OAuth handoff before navigating to QuickBooks", async () => {
  const storage = new Map<string, string>();
  storage.set("porter-financial-health-audit-v2", JSON.stringify({
    ...remote,
    stepId: "connect",
    path: null,
    answers: { business_type: "Professional services" },
    auditId: "audit-id",
    auditToken: "secret",
    connectionStatus: "not_started",
  }));
  const events: string[] = [];
  const browser: AuditBrowserPort = {
    origin: "https://landing.example.com",
    hostname: "landing.example.com",
    pathname: () => "/financial-health-audit",
    search: () => "",
    readStorage: (key) => {
      events.push(`read:${key}`);
      return storage.get(key) ?? null;
    },
    writeStorage: (key, value) => {
      storage.set(key, value);
      events.push(`write:${key}:${value}`);
    },
    removeStorage: (key) => storage.delete(key),
    replaceUrl: () => undefined,
    navigate: (url) => events.push(`navigate:${url}`),
    scrollToTop: () => undefined,
  };
  vi.mocked(api.startFinancialHealthQuickBooksConnection).mockResolvedValue({
    authUrl: "https://appcenter.intuit.com/connect/oauth2",
  });
  const user = userEvent.setup();

  render(<ControllerHarness browser={browser} />);
  const button = screen.getByRole("button", { name: "Start QuickBooks" });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  await user.click(button);
  await waitFor(() => expect(events.some((event) => event.startsWith("navigate:"))).toBe(true));

  const authorizingWrite = events.findIndex(
    (event) => event.startsWith("write:porter-financial-health-audit-v2:") &&
      event.includes('"quickBooksPhase":"authorizing"'),
  );
  const verifiedRead = events.findIndex(
    (event, index) => index > authorizingWrite && event === "read:porter-financial-health-audit-v2",
  );
  const navigation = events.findIndex((event) => event.startsWith("navigate:"));
  expect(authorizingWrite).toBeGreaterThanOrEqual(0);
  expect(verifiedRead).toBeGreaterThan(authorizingWrite);
  expect(navigation).toBeGreaterThan(verifiedRead);
});

it("persists and verifies a callback outcome before clearing its URL", async () => {
  const storage = new Map<string, string>();
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "active-audit",
    auditToken: "secret",
    connectionStatus: "not_started" as const,
    quickBooksPhase: "authorizing" as const,
  };
  storage.set("porter-financial-health-audit-v2", JSON.stringify(saved));
  storage.set("porter-financial-health-audit-qbo-started-at", "123");
  const events: string[] = [];
  const browser: AuditBrowserPort = {
    origin: "https://landing.example.com",
    hostname: "landing.example.com",
    pathname: () => "/financial-health-audit",
    search: () => "?quickbooks=error",
    readStorage: (key) => {
      events.push(`read:${key}`);
      return storage.get(key) ?? null;
    },
    writeStorage: (key, value) => {
      events.push(`write:${key}:${value}`);
      storage.set(key, value);
    },
    removeStorage: (key) => storage.delete(key),
    replaceUrl: (url) => events.push(`replace:${url}`),
    navigate: () => undefined,
    scrollToTop: () => undefined,
  };
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...saved,
    connectionStatus: "pending",
  });

  render(<ControllerHarness browser={browser} />);

  await waitFor(() => expect(events.some((event) => event.startsWith("replace:"))).toBe(true));
  const tombstoneWrite = events.findIndex(
    (event) => event.startsWith("write:porter-financial-health-audit-v2:") &&
      event.includes('"quickBooksPhase":"authorization_failed"'),
  );
  const verifiedRead = events.findIndex(
    (event, index) => index > tombstoneWrite && event === "read:porter-financial-health-audit-v2",
  );
  const replacedUrl = events.findIndex((event) => event.startsWith("replace:"));
  expect(tombstoneWrite).toBeGreaterThanOrEqual(0);
  expect(verifiedRead).toBeGreaterThan(tombstoneWrite);
  expect(replacedUrl).toBeGreaterThan(verifiedRead);
});

it("shares one QBO waiter between immediate monitoring and report gating", async () => {
  const answers = Object.fromEntries(
    FLOWS.connected.flatMap((stepId) => (STEPS[stepId].fields ?? [])
      .filter((field) => field.options?.length)
      .map((field) => [
        field.name,
        field.type === "multi" ? [field.options![0].label] : field.options![0].label,
      ])),
  );
  const saved = {
    ...remote,
    stepId: "complete-c",
    path: "connected" as const,
    answers,
    auditId: "audit-id",
    auditToken: "secret",
    connectionStatus: "pending" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockImplementation(
    () => new Promise(() => undefined),
  );

  render(<FinancialHealthAudit />);

  await waitFor(() => expect(api.waitForFinancialHealthQuickBooksConnection).toHaveBeenCalledOnce());
  await new Promise((resolve) => window.setTimeout(resolve, 10));
  expect(api.waitForFinancialHealthQuickBooksConnection).toHaveBeenCalledOnce();
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
});

it("retires an in-flight document upload when the visitor changes source", async () => {
  const saved = {
    ...remote,
    stepId: "document-upload",
    path: "documents" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "documents",
    },
    auditId: "audit-id",
    auditToken: "secret",
    connectionStatus: "not_started" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.uploadFinancialHealthAuditDocument).mockImplementation(
    () => new Promise(() => undefined),
  );
  const user = userEvent.setup();

  render(<FinancialHealthAudit />);
  await screen.findByRole("heading", { name: STEPS["document-upload"].title });
  const firstInput = screen.getByLabelText(/Drop files here, or choose files/);
  await user.upload(firstInput, new File(["books"], "books.pdf", { type: "application/pdf" }));
  await waitFor(() => expect(api.uploadFinancialHealthAuditDocument).toHaveBeenCalledOnce());
  expect((firstInput as HTMLInputElement).disabled).toBe(true);

  await user.click(screen.getByRole("button", { name: "Back" }));
  await user.click(screen.getByRole("button", { name: /Answer a few questions/ }));
  await screen.findByRole("heading", { name: STEPS.context.title });
  await user.click(screen.getByRole("button", { name: "Back" }));
  await user.click(screen.getByRole("button", { name: /Upload financial documents/ }));

  await screen.findByRole("heading", { name: STEPS["document-upload"].title });
  expect((screen.getByLabelText(/Drop files here, or choose files/) as HTMLInputElement).disabled).toBe(false);
});

it("repairs a persisted QuickBooks import that was left on the connection step", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: null,
    connectionStatus: "pending" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockImplementation(
    () => new Promise(() => undefined),
  );

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("Importing QuickBooks");
  expect(document.body.textContent).not.toContain("Opening QuickBooks");
  expect(api.waitForFinancialHealthQuickBooksConnection).toHaveBeenCalledWith(
    "audit-id",
    "secret",
    expect.any(AbortSignal),
  );
});

it("restores a connected QuickBooks audit past the connection chooser", async () => {
  const saved = {
    ...remote,
    stepId: "connect",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: "Audit Company",
    connectionStatus: "connected" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue(saved);

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.goal.title });
  expect(screen.getByRole("status").textContent).toContain("QuickBooks ready");
  expect(api.waitForFinancialHealthQuickBooksConnection).not.toHaveBeenCalled();
});

it("does not rewind valid questionnaire progress when the remote save lags", async () => {
  const saved = {
    ...remote,
    stepId: "bookkeeping",
    path: "connected" as const,
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
      audit_goals: ["Understand my cash flow needs"],
    },
    auditId: "audit-id",
    auditToken: "secret",
    companyName: "Audit Company",
    connectionStatus: "connected" as const,
  };
  window.sessionStorage.setItem("porter-financial-health-audit-v2", JSON.stringify(saved));
  vi.mocked(api.getFinancialHealthAudit).mockResolvedValue({
    ...saved,
    stepId: "connect",
    answers: {
      business_type: "Professional services",
      connection_choice: "quickbooks",
    },
  });

  render(<FinancialHealthAudit />);

  await screen.findByRole("heading", { name: STEPS.bookkeeping.title });
  expect(screen.getByRole("status").textContent).toContain("QuickBooks ready");
});

it("lead capture asks for an email only", async () => {
  // Reason: the first name was collected but never consumed anywhere -- no
  // greeting, no report use -- so the intake form asks for an email and nothing
  // else. A reintroduced name field would fail here.
  await renderHydratedAudit();
  expect(screen.getByRole("textbox", { name: "Email" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "First name" })).toBeNull();
});
