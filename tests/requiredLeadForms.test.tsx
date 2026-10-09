// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleReadyPage } from "../src/pages/SaleReady";
import { BooksCleanupPage } from "../src/pages/BooksCleanup";
import { useWaitlist, WaitlistProvider } from "../src/components/WaitlistDialog";
vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("../src/lib/marketingAnalytics", () => ({ trackMarketingEvent: vi.fn() }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function ContactButton({ demo = false }: { demo?: boolean }) {
  const { open } = useWaitlist();
  return <button onClick={() => demo ? open({ action: "book_demo" }) : open()}>Open form</button>;
}
describe("all campaign questions", () => {
  // Reason: These independent campaign forms use button selections, so native
  // required inputs alone cannot stop incomplete leads from being delivered.
  it.each([SaleReadyPage, BooksCleanupPage])("blocks unanswered campaign choices and submits after correction", async (Page) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"conversion_eligible":false}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Page />);
    const name = screen.getByRole("textbox", { name: "First name" }) as HTMLInputElement;
    const form = name.form!;
    fireEvent.change(name, { target: { value: "Ada" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Last name" }), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Business name or website" }), { target: { value: "engines.example" } });
    fireEvent.submit(form);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("answer every question");
    for (const group of within(form).getAllByRole("group")) {
      fireEvent.click(within(group).getAllByRole("button")[0]);
    }
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
  it.each(["name", "email", "company", "existing_finance_team", "business_type", "current_software", "help_with", "blank", "invalid_email"])("blocks missing contact answer %s", async (missing) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"conversion_eligible":false}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistProvider><ContactButton /></WaitlistProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open form" }));
    const name = screen.getByRole("textbox", { name: /^Name/ }) as HTMLInputElement;
    const form = name.form!;
    const values = { name: "Ada", email: "ada@example.com", company: "Engines", business_type: "Design", current_software: "QuickBooks", help_with: "Bookkeeping" };
    for (const [key, value] of Object.entries(values)) {
      fireEvent.change(form.elements.namedItem(key) as HTMLInputElement, { target: { value: key === missing ? "" : value } });
    }
    if (missing !== "existing_finance_team") fireEvent.click(screen.getByRole("radio", { name: "No" }));
    if (missing === "blank") fireEvent.change(name, { target: { value: "   " } });
    if (missing === "invalid_email") fireEvent.change(form.elements.namedItem("email") as HTMLInputElement, { target: { value: "invalid" } });
    fireEvent.submit(form);
    expect(fetchMock).not.toHaveBeenCalled();
    for (const [key, value] of Object.entries(values)) fireEvent.change(form.elements.namedItem(key) as HTMLInputElement, { target: { value } });
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});


describe("completed booking conversion", () => {
  // Reason: Release reconciliation must keep production's conversion exclusions
  // while adding develop's once-only completed-booking event.
  it.each([true, false])("honors conversion eligibility %s and ignores repeated messages", async (eligible) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ conversion_eligible: eligible }), { status: 200 })));
    const pixel = vi.fn();
    vi.stubGlobal("fbq", pixel);
    render(<WaitlistProvider><ContactButton demo /></WaitlistProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open form" }));
    const name = screen.getByRole("textbox", { name: /^Name/ }) as HTMLInputElement;
    const form = name.form!;
    for (const [key, value] of Object.entries({ name: "Ada", email: "ada@example.com", company: "Engines", help_with: "Bookkeeping" })) {
      fireEvent.change(form.elements.namedItem(key) as HTMLInputElement, { target: { value } });
    }
    fireEvent.click(screen.getByRole("radio", { name: "No" }));
    fireEvent.submit(form);
    await screen.findByRole("button", { name: "Open calendar again" });
    const message = { origin: "https://calendly.com", data: { event: "calendly.event_scheduled" } };
    fireEvent(window, new MessageEvent("message", { ...message, origin: "https://example.com" }));
    expect(pixel.mock.calls.filter(([, event]) => event === "Schedule")).toHaveLength(0);
    fireEvent(window, new MessageEvent("message", message));
    fireEvent(window, new MessageEvent("message", message));
    expect(pixel.mock.calls.filter(([, event]) => event === "Schedule")).toHaveLength(eligible ? 1 : 0);
    expect(screen.getByText("Thank you. Your demo is booked.")).toBeTruthy();
  });
});
