// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openCalendlyPopup } from "../lib/calendly";
import { Nav } from "../primitives/Nav";
import { WaitlistProvider } from "./WaitlistDialog";

vi.mock("../lib/calendly", () => ({
  openCalendlyPopup: vi.fn(),
}));

const openCalendlyPopupMock = vi.mocked(openCalendlyPopup);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("demo booking handoff", () => {
  it("posts one normalized lead, ignores unrelated messages, and reopens Calendly without reposting", async () => {
    // Reason: This test locks the lead-first state machine Ben requested in PR
    // 43, including the boundary between lead capture and booking confirmation.
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <WaitlistProvider>
        <Nav />
      </WaitlistProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Book a demo" }));
    const nameInput = screen.getByRole("textbox", { name: /^Name/ });
    // Reason: The dialog intentionally focuses its first field after the open
    // animation begins. Wait for that handoff so the test types like a visitor.
    await waitFor(() => expect(document.activeElement).toBe(nameInput));
    await user.type(nameInput, "  Ada Lovelace  ");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "  ADA@EXAMPLE.COM  ");
    await user.type(screen.getByRole("textbox", { name: /Company name/ }), "  Analytical Engines  ");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(
      screen.getByRole("textbox", { name: /What would you like Porter's help with/ }),
      "  Month-end close  ",
    );
    await user.click(screen.getByRole("button", { name: "Book my demo" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(openCalendlyPopupMock).toHaveBeenCalledTimes(1));

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      existing_finance_team: "No",
      help_with: "Month-end close",
      action: "book_demo",
      _honey: "",
    });

    const calendlyUrl = new URL(String(openCalendlyPopupMock.mock.calls[0]?.[0]));
    expect(calendlyUrl.searchParams.get("name")).toBe("Ada Lovelace");
    expect(calendlyUrl.searchParams.get("email")).toBe("ada@example.com");
    expect(calendlyUrl.searchParams.get("a1")).toBe("Analytical Engines");
    expect(calendlyUrl.searchParams.get("a2")).toBe("No");
    expect(calendlyUrl.searchParams.get("a3")).toBe("Month-end close");

    fireEvent(
      window,
      new MessageEvent("message", {
        origin: "https://example.com",
        data: { event: "calendly.event_scheduled" },
      }),
    );
    fireEvent(
      window,
      new MessageEvent("message", {
        origin: "https://calendly.com",
        data: { event: "calendly.profile_page_viewed" },
      }),
    );
    expect(screen.queryByText("Thank you. Your demo is booked.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open calendar again" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(openCalendlyPopupMock).toHaveBeenCalledTimes(2);

    fireEvent(
      window,
      new MessageEvent("message", {
        origin: "https://calendly.com",
        data: { event: "calendly.event_scheduled" },
      }),
    );
    expect(await screen.findByText("Thank you. Your demo is booked.")).toBeTruthy();
  });
});
