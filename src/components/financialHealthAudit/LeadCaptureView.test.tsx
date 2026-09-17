// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { LeadCaptureView } from "./LeadCaptureView";
import { FinancialHealthAuditRequestError } from "../../services/financialHealthAuditError";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.mocked(posthog.capture).mockClear();
});

function renderGate(onSubmit: (email: string) => Promise<void>) {
  return render(
    <LeadCaptureView
      onSubmit={onSubmit}
      onBack={() => {}}
      titleRef={createRef<HTMLHeadingElement>()}
    />,
  );
}

async function submit(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), email);
  await user.click(screen.getByRole("button", { name: /continue|save|submit/i }));
}

function failureProperties() {
  const call = vi
    .mocked(posthog.capture)
    .mock.calls.find(([event]) => event === "financial_health_audit_lead_capture_failed");
  return call?.[1];
}

// Reason (POR-3051): POR-2942's business-email gate rejects real visitors with
// code=invalid_input / field=email. Before this test the failure event carried
// no properties, so that rejection was indistinguishable from an outage and had
// to be diagnosed from Render production logs. Pin the machine contract.
it("reports the API's rejection code and field when the business-email gate refuses a submit", async () => {
  renderGate(() =>
    Promise.reject(
      new FinancialHealthAuditRequestError(
        "Please use your business email address.",
        400,
        "invalid_input",
        { field: "email" },
      ),
    ),
  );

  await submit("owner@gmail.com");

  await waitFor(() =>
    expect(failureProperties()).toMatchObject({
      status: 400,
      code: "invalid_input",
      field: "email",
    }),
  );
});

// Reason: The visitor's typed address is their data and the user-facing copy is
// not a stable analytics key. Neither may ride along on the event.
it("never sends the typed address or the user-facing copy", async () => {
  renderGate(() =>
    Promise.reject(
      new FinancialHealthAuditRequestError(
        "Please use your business email address.",
        400,
        "invalid_input",
        { field: "email" },
      ),
    ),
  );

  await submit("owner@gmail.com");

  await waitFor(() => expect(failureProperties()).toBeDefined());
  const serialized = JSON.stringify(failureProperties());
  expect(serialized).not.toContain("owner@gmail.com");
  expect(serialized).not.toContain("business email address");
});

// Reason: A non-API failure (network drop, thrown TypeError) must still be
// recorded, and must read as "no code" rather than borrowing the gate's.
it("records a null code when the failure is not an API error", async () => {
  renderGate(() => Promise.reject(new Error("Network request failed")));

  await submit("owner@example.com");

  await waitFor(() =>
    expect(failureProperties()).toMatchObject({ status: null, code: null, field: null }),
  );
});
