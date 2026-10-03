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
    // Reason: Optional details can inform the recommendation, while contact
    // submission itself never requires a calendar booking.
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
    await user.click(screen.getByText("Add business details (optional)"));
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

  it("accepts contact details without forcing extra company-group answers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true, conversion_eligible: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<WaitlistProvider><MultiEntityLeadButton /></WaitlistProvider>);
    await user.click(screen.getByRole("button", { name: "Get a recommendation" }));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ada");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ada@example.com");
    await user.type(screen.getByRole("textbox", { name: /Company name/ }), "Analytical Engines");
    expect(screen.getByText("Add business details (optional)").closest("details")?.hasAttribute("open")).toBe(false);
    for (const radio of screen.getAllByRole("radio")) expect(radio.hasAttribute("required")).toBe(false);
    await user.click(screen.getByRole("button", { name: "Send me a recommendation" }));
    expect(await screen.findByText("Thank you. We’ll put together a recommendation for your business.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.help_with).not.toContain("Companies or entities managed:");
    expect(body.help_with).not.toContain("Top priority:");
  });
});
