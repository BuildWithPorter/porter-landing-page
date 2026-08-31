// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FinancialHealthAudit } from "./FinancialHealthAudit";
import * as api from "../services/financialHealthAudit";
import { FLOWS, STEPS } from "./financialHealthAuditFlow";

vi.mock("../components/Seo", () => ({ Seo: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("../services/financialHealthAudit", () => ({
  createFinancialHealthAudit: vi.fn(),
  updateFinancialHealthAudit: vi.fn(),
  captureFinancialHealthAuditEmail: vi.fn(),
  requestFinancialHealthAuditRecovery: vi.fn(),
  startFinancialHealthAuditEmailRecovery: vi.fn(),
  startFinancialHealthQuickBooksConnection: vi.fn(),
  generateFinancialHealthAudit: vi.fn(),
  listFinancialHealthAuditDocuments: vi.fn(),
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
  vi.mocked(api.updateFinancialHealthAudit).mockResolvedValue(remote);
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: false });
  vi.mocked(api.requestFinancialHealthAuditRecovery).mockResolvedValue({ state: "recovery-state" });
  vi.mocked(api.waitForFinancialHealthQuickBooksConnection).mockResolvedValue({ status: "connected", companyName: "Company", connectedAt: "2026-08-31" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
    capturedEmail: "owner@example.com", answers: {},
  });
  await waitFor(() => expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull());
  expect(api.generateFinancialHealthAudit).not.toHaveBeenCalled();
  expect(api.startFinancialHealthAuditEmailRecovery).not.toHaveBeenCalled();
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

it.each(["generating", "failed"] as const)("resumes a %s report after email proof with the rotated bearer", async (status) => {
  // Reason: Installing recovered credentials alone left the report in idle;
  // returning owners must resume without refreshing or creating another company.
  vi.mocked(api.captureFinancialHealthAuditEmail).mockResolvedValue({ ...remote, recoveryAvailable: true });
  vi.mocked(api.startFinancialHealthAuditEmailRecovery).mockResolvedValue({ challengeId: "challenge" });
  vi.mocked(api.verifyFinancialHealthAuditEmailRecovery).mockResolvedValue({
    id: "saved-audit", path: "connected", report: null,
    capturedEmail: remote.capturedEmail, capturedFirstName: remote.capturedFirstName,
    session: { ...remote, id: "saved-audit", accessToken: "rotated-secret", status,
      stepId: "complete-c", path: "connected", answers: Object.fromEntries(
        FLOWS.connected.flatMap((step) => (STEPS[step].fields ?? [])
          .filter((field) => field.options?.length)
          .map((field) => [field.name, field.type === "multi" ? [field.options![0].label] : field.options![0].label])),
      ) },
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
  expect(api.createFinancialHealthAudit).toHaveBeenCalledOnce();
  // Reason: The same live waiting component must not promise a one-minute
  // completion time when observed runs take several minutes.
  expect(document.body.textContent).not.toContain("≈1:00");
  expect(document.body.textContent).toMatch(/\d+:\d{2} elapsed/);
});

it("lead capture asks for an email only", async () => {
  // Reason: the first name was collected but never consumed anywhere -- no
  // greeting, no report use -- so the intake form asks for an email and nothing
  // else. A reintroduced name field would fail here.
  await renderHydratedAudit();
  expect(screen.getByRole("textbox", { name: "Email" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "First name" })).toBeNull();
});
