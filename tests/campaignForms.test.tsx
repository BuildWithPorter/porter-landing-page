// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BooksCleanupPage } from "../src/pages/BooksCleanup";
import { SaleReadyPage } from "../src/pages/SaleReady";
import { Nav } from "../src/primitives/Nav";
import { Footer } from "../src/primitives/Footer";
import { WaitlistProvider } from "../src/components/WaitlistDialog";
import { BOOKS_CLEANUP_OFFER } from "../api/books-cleanup";
import { SALE_READY_OFFER } from "../api/sale-ready";
import { validChecklistLead, leadNotificationHtml } from "../server/checklistLead";

vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("../src/lib/marketingAnalytics", () => ({ trackMarketingEvent: vi.fn() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("campaign form access", () => {
  it.each([['cleanup', BooksCleanupPage, '/api/books-cleanup'], ['sale', SaleReadyPage, '/api/sale-ready']] as const)("submits %s after every question is answered", async (_offer, Page, endpoint) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true, conversion_eligible: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<Page />);
    expect(container.querySelector('form')?.querySelectorAll('[required]')).toHaveLength(2);
    // Reason: Ben requires business questions; keep them visible so validation can be corrected.
    expect(container.querySelector('form details')).toBeNull();
    expect(container.querySelector('.sale-ready-hero + .sale-ready-form-section')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Get the free checklist' })[0].getAttribute('href')).toBe('#checklist');
    await user.type(screen.getByRole('textbox', { name: 'First name' }), 'Ada');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send me the checklist' }));
    expect(fetchMock).not.toHaveBeenCalled();
    for (const group of within(container.querySelector('form')!).getAllByRole('group')) {
      await user.click(within(group).getAllByRole('button')[0]);
    }
    await user.click(screen.getByRole('button', { name: 'Send me the checklist' }));
    expect(await screen.findByText(/Your checklist is on its way to your inbox/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(endpoint);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ first_name: 'Ada', email: 'ada@example.com' });
    expect(body.timeframe || body.books_behind || body.books_status).toBeTruthy();
  });

  it("keeps optional answers optional at the server boundary without fabricating them", () => {
    const lead = { submission_id: '0f8fad5b-d9cb-469f-a165-70867728950e', first_name: 'Ada', email: 'ada@example.com' };
    for (const offer of [BOOKS_CLEANUP_OFFER, SALE_READY_OFFER]) {
      expect(validChecklistLead(offer, lead)).toBe(true);
      expect(leadNotificationHtml(offer, lead)).toContain('Not provided');
      expect(validChecklistLead(offer, { ...lead, first_name: '' })).toBe(false);
      expect(validChecklistLead(offer, { ...lead, email: 'malformed' })).toBe(false);
    }
    expect(validChecklistLead(BOOKS_CLEANUP_OFFER, { ...lead, books_behind: 'invented' })).toBe(false);
    expect(validChecklistLead(SALE_READY_OFFER, { ...lead, timeframe: 'invented' })).toBe(false);
    expect(validChecklistLead(SALE_READY_OFFER, { ...lead, help_with: ['invented'] })).toBe(false);
  });

  it("uses main-site destinations and the recommendation form in campaign navigation", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><WaitlistProvider><Nav multiEntity /><Footer homeOrigin="https://buildwithporter.com" /></WaitlistProvider></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Porter home' }).getAttribute('href')).toBe('https://buildwithporter.com/');
    expect(screen.getAllByRole('link', { name: 'Our software' }).map(x => x.getAttribute('href'))).toEqual(['https://buildwithporter.com/use-cases', 'https://buildwithporter.com/#software']);
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('https://buildwithporter.com/privacy-policy');
    await user.click(screen.getByRole('button', { name: 'Get a recommendation' }));
    expect(screen.getByRole('heading', { name: 'Get a multi-entity recommendation.' })).toBeTruthy();
  });

  it("preserves normal homepage footer destinations", () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Developers' }).getAttribute('href')).toBe('/developers');
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy-policy');
  });
});
