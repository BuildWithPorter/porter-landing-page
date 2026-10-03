// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWaitlist, WaitlistProvider } from "./WaitlistDialog";
import { trackMarketingEvent } from "../lib/marketingAnalytics";

vi.mock("../lib/marketingAnalytics", () => ({ trackMarketingEvent: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function MultiEntityLeadButton() {
  const { open } = useWaitlist();
  return <button onClick={() => open({ multiEntity: true, action: "book_demo" })}>Get a recommendation</button>;
}

describe("multi-entity recommendation request", () => {
  it.each([true, false])("honors conversion eligibility %s after a delivered form without requiring a calendar", async (eligible) => {
    // Reason: The multi-entity lead only needs an email and two quick choices before Porter follows up;
    // asking for a calendar booking would add the commitment this flow is meant to remove.
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, conversion_eligible: eligible }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pixel = vi.fn();
    vi.stubGlobal("fbq", pixel);
    const user = userEvent.setup();

    render(
      <WaitlistProvider>
        <MultiEntityLeadButton />
      </WaitlistProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Get a recommendation" }));
    const nameInput = screen.getByRole("textbox", { name: /^Name/ });
    await waitFor(() => expect(document.activeElement).toBe(nameInput));
    await user.type(nameInput, "Ada Lovelace");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ADA@EXAMPLE.COM");
    await user.type(screen.getByRole("textbox", { name: /Company name/ }), "Analytical Engines");
    await user.click(screen.getByRole("radio", { name: "6–10" }));
    await user.click(screen.getByRole("radio", { name: "Close faster each month" }));
    await user.click(screen.getByRole("button", { name: "Send me a recommendation" }));

    expect(await screen.findByText("Thank you. We’ll put together a recommendation for your business.")).toBeTruthy();
    expect(screen.queryByText(/Calendly|calendar/i)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      action: "book_demo",
      help_with: expect.stringContaining("Companies or entities managed: 6–10\n\nTop priority: Close faster each month"),
    });
    expect(JSON.parse(String(request?.body)).help_with).toContain("Form page: http://localhost:3000/");
    expect(pixel).toHaveBeenCalledTimes(eligible ? 1 : 0);
    expect(trackMarketingEvent).toHaveBeenCalledWith(eligible ? "marketing_lead_captured" : "marketing_form_excluded", expect.objectContaining({ offer: "multi_entity", is_test: !eligible, submission_id: expect.any(String) }));
  });
});
