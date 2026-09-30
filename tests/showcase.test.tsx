// @vitest-environment jsdom
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USE_CASES } from "../src/content/useCases";
import { CASES } from "../src/content/proof";
import { UseCaseFilm } from "../src/components/UseCaseFilm";
import { UseCaseGallery } from "../src/sections/UseCaseGallery";
import { UseCasePage } from "../src/pages/UseCases";
import { trackMarketingEvent } from "../src/lib/marketingAnalytics";

vi.mock("vite-react-ssg", () => ({ Head: ({children}: {children: React.ReactNode}) => <>{children}</> }));
vi.mock("../src/lib/marketingAnalytics", () => ({ trackMarketingEvent: vi.fn() }));
vi.mock("../src/components/WaitlistDialog", () => ({ WaitlistProvider: ({children}: {children: React.ReactNode}) => <>{children}</>, useWaitlist: () => ({ open: vi.fn() }) }));
let enter: (entries: {isIntersecting: boolean}[]) => void;
let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal("IntersectionObserver", class { constructor(callback: typeof enter) {enter=callback;} observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.spyOn(window,"scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype,"load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype,"play").mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("play")); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype,"pause").mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("pause")); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");

describe("showcase discovery", () => {
  it("includes all 20 unique stories in the sitemap and in machine-readable navigation", () => {
    expect(new Set(USE_CASES.map(x=>x.slug)).size).toBe(20);
    for(const item of USE_CASES) {
      expect(read("public/sitemap.xml")).toContain(`<loc>https://buildwithporter.com/use-cases/${item.slug}</loc>`);
      expect(read("public/llms.txt")).toContain(`/use-cases/${item.slug}`);
    }
  });
  it("filters the actual linked cards and records the category", () => {
    render(<MemoryRouter><UseCaseGallery /></MemoryRouter>);
    expect(screen.getAllByRole("heading",{level:2})).toHaveLength(20);
    fireEvent.click(screen.getByRole("button",{name:"Get paid"}));
    expect(screen.getAllByRole("heading",{level:2})).toHaveLength(2);
    expect(screen.getByRole("link",{name:/^The invoice nobody sent$/}).getAttribute("href")).toBe("/use-cases/invoice-nobody-billed");
    expect(trackMarketingEvent).toHaveBeenCalledWith("use_case_filter",{category:"Get paid"});
  });
  it("renders a directly addressed detail page with the three beats and CTA tracking", () => {
    render(<MemoryRouter initialEntries={["/use-cases/works-where-you-work"]}><Routes><Route path="/use-cases/:slug" element={<UseCasePage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading",{level:1}).textContent).toContain("ChatGPT and Claude");
    for(const text of ["Without Porter","With Porter","The result"]) expect(screen.getByText(text)).toBeTruthy();
    expect(trackMarketingEvent).toHaveBeenCalledWith("use_case_view",{slug:"works-where-you-work"});
    fireEvent.click(screen.getAllByRole("button",{name:/Get a recommendation/}).at(-1)!);
    expect(trackMarketingEvent).toHaveBeenCalledWith("use_case_cta_click",{slug:"works-where-you-work"});
  });
});
describe("motion and bandwidth", () => {
  it("requests no video until visible, pauses off screen, and honors explicit pause", async () => {
    const {container}=render(<UseCaseFilm item={USE_CASES[0]} />);
    expect(container.querySelector("source")).toBeNull();
    await act(async()=>enter([{isIntersecting:true}]));
    expect(container.querySelectorAll("source")).toHaveLength(2);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:/Pause/}));
    const calls=vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
    await act(async()=>enter([{isIntersecting:false}]));
    await act(async()=>enter([{isIntersecting:true}]));
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length).toBe(calls);
  });
  it("shows only the poster for reduced motion until the visitor chooses play", async () => {
    reduced=true;
    const {container}=render(<UseCaseFilm item={USE_CASES[0]} />);
    await act(async()=>enter([{isIntersecting:true}]));
    expect(container.querySelector("source")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await act(async()=>fireEvent.click(screen.getByRole("button",{name:/Play/})));
    expect(container.querySelectorAll("source")).toHaveLength(2);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
it("keeps proof copy plain, anonymous in structure, and free of the retired badge", () => {
  expect(CASES).toHaveLength(10);
  const text=CASES.map(x=>`${x.kind} ${x.body}`).join(" ");
  for(const banned of [/—/,/\bAI\b/,/\bagents?\b/i,/automat/i,/\bMCP\b/,/copilot/i,/\bdebits?\b/i,/\bcredits?\b(?! line)/i,/journal entr/i,/reconcil/i,/\bA\/?[RP]\b/,/revenue recognition/i,/design partner/i]) expect(text).not.toMatch(banned);
});
