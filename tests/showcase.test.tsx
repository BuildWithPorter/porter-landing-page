// @vitest-environment jsdom
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import markdownHandler from "../api/markdown";
import { CATEGORIES, USE_CASES } from "../src/content/useCases";
import { SERVICES } from "../src/content/sitePages";
import { CASES } from "../src/content/proof";
import { UseCaseFilm } from "../src/components/UseCaseFilm";
import { UseCaseGallery } from "../src/sections/UseCaseGallery";
import { Pain } from "../src/sections/Pain";
import { ScalesWithYou } from "../src/sections/ScalesWithYou";
import { WhatPorterDoes } from "../src/sections/WhatPorterDoes";
import { UseCasesPage, UseCasePage } from "../src/pages/UseCases";
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
  it("numbers curated cards by reading order while preserving the chosen stories", () => {
    const {container} = render(<MemoryRouter><UseCaseGallery teaser /></MemoryRouter>);
    expect(Array.from(container.querySelectorAll(".use-card__copy .micro-label"), el => el.textContent)).toEqual([
      "01 / Get paid", "02 / Answers", "03 / Answers", "04 / Planning", "05 / More than one company", "06 / Answers",
    ]);
    const links = Array.from(container.querySelectorAll(".use-card__title a"), el => el.getAttribute("href"));
    expect(links.slice(0,3)).toEqual(["/use-cases/invoice-nobody-billed", "/use-cases/ask-your-books", "/use-cases/text-your-books"]);
  });
  it("restarts numbering at 01 for each filtered collection and restores 01–20 for All", () => {
    const {container} = render(<MemoryRouter><UseCaseGallery /></MemoryRouter>);
    for (const category of [...CATEGORIES, "All"]) {
      fireEvent.click(screen.getByRole("button", {name: category, exact: true}));
      const labels = Array.from(container.querySelectorAll(".use-card__copy .micro-label"), el => el.textContent!.split(" / ")[0]);
      const count = category === "All" ? 20 : USE_CASES.filter(item => item.category === category).length;
      expect(labels).toEqual(Array.from({length:count}, (_, i) => String(i+1).padStart(2,"0")));
    }
  });
  it("renders a directly addressed detail page with the three beats and CTA tracking", () => {
    render(<MemoryRouter initialEntries={["/use-cases/works-where-you-work"]}><Routes><Route path="/use-cases/:slug" element={<UseCasePage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading",{level:1}).textContent).toContain("ChatGPT and Claude");
    expect(document.querySelector(".use-detail__heading .micro-label")?.textContent).toBe("Answers");
    for(const text of ["Without Porter","With Porter","The result"]) expect(screen.getByText(text)).toBeTruthy();
    expect(trackMarketingEvent).toHaveBeenCalledWith("use_case_view",{slug:"works-where-you-work"});
    fireEvent.click(screen.getAllByRole("button",{name:/Talk to Porter/}).at(-1)!);
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

it("serves the same use-case copy to Markdown clients", async () => {
  for (const item of USE_CASES) {
    const response = markdownHandler(new Request(`https://buildwithporter.com/use-cases/${item.slug}`, { headers: { Accept: "text/markdown" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(await response.text()).toContain(item.during);
  }
});

it("serves the separate service and proof pages to text clients without inventing results", async () => {
  const services = await markdownHandler(new Request("https://buildwithporter.com/services", {headers: {Accept: "text/markdown"}})).text();
  for (const service of SERVICES) expect(services).toContain(service.body);
  const why = await markdownHandler(new Request("https://buildwithporter.com/why-porter", {headers: {Accept: "text/markdown"}})).text();
  for (const story of CASES) expect(why).toContain(story.body);
  expect(why).toContain("Can I use Porter in ChatGPT or Claude?");
});


describe("graphic-led service and software presentation", () => {
  it("changes the service explanation and illustration together", () => {
    const {container} = render(<WhatPorterDoes />);
    expect(screen.getByText(SERVICES[0].body)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: /05 Taxes/}));
    expect(screen.queryByText(SERVICES[0].body)).toBeNull();
    expect(screen.getByText(SERVICES[4].body)).toBeTruthy();
    expect(container.querySelector(".wpd__art img")?.getAttribute("src")).toBe("/editorial/service-5.svg");
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
  });
  it("starts the software collection with its films and filters, without repeating the homepage showcase", () => {
    const {container} = render(<MemoryRouter><UseCasesPage /></MemoryRouter>);
    expect(screen.getByRole("heading", {level:1,name:"See Porter work."})).toBeTruthy();
    expect(container.querySelectorAll(".use-card")).toHaveLength(20);
    expect(container.querySelector(".pis")).toBeNull();
  });
});


describe("challenge framing and automatic proof motion", () => {
  it("keeps the current-provider challenge distinct from the Porter solution", () => {
    const {container} = render(<Pain cinematic />);
    expect(screen.getByText("The challenges with your current finance setup.")).toBeTruthy();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelectorAll(".pain__challenge")).toHaveLength(4);
    expect(screen.getByRole("heading", {name:"The same transactions. The same questions."})).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toContain("/use-cases/");
  });
  it("does not turn page scrolling into a permanent carousel pause", () => {
    render(<ScalesWithYou />);
    const rail=screen.getByLabelText("Customer stories");
    expect(screen.getByRole("button", {name:"Pause customer stories"})).toBeTruthy();
    fireEvent.wheel(rail, {deltaY:100,deltaX:0});
    expect(screen.queryByRole("button", {name:"Play customer stories"})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name:"Pause customer stories"}));
    expect(screen.getByRole("button", {name:"Play customer stories"})).toBeTruthy();
  });
});

describe("open customer story presentation", () => {
  afterEach(() => vi.useRealTimers());
  it("advances automatically, stops while reading or hovering, and preserves explicit pause", async () => {
    vi.useFakeTimers();
    const {container}=render(<ScalesWithYou />);
    const region=screen.getByRole("region", {name:"Customer stories"});
    const current=()=>container.querySelector('.sws__story:not([hidden])')?.getAttribute('aria-label');
    await act(async()=>enter([{isIntersecting:true}]));
    act(()=>vi.advanceTimersByTime(8000));
    expect(current()).toBe(CASES[1].kind);
    fireEvent.mouseEnter(region);
    act(()=>vi.advanceTimersByTime(16000));
    expect(current()).toBe(CASES[1].kind);
    fireEvent.mouseLeave(region);
    act(()=>vi.advanceTimersByTime(8000));
    expect(current()).toBe(CASES[2].kind);
    const details=container.querySelector('.sws__story:not([hidden]) details') as HTMLDetailsElement;
    details.open=true;
    fireEvent(details,new Event('toggle'));
    act(()=>vi.advanceTimersByTime(16000));
    expect(current()).toBe(CASES[2].kind);
    details.open=false;
    fireEvent(details,new Event('toggle'));
    fireEvent.click(screen.getByRole('button',{name:'Pause customer stories'}));
    fireEvent.mouseEnter(region);fireEvent.mouseLeave(region);
    act(()=>vi.advanceTimersByTime(16000));
    expect(current()).toBe(CASES[2].kind);
    fireEvent.click(screen.getByRole('button',{name:'Play customer stories'}));
    act(()=>vi.advanceTimersByTime(8000));
    expect(current()).toBe(CASES[3].kind);
  });
  it("honors reduced motion and wraps manual navigation through all ten stories", async () => {
    vi.useFakeTimers();reduced=true;
    const {container}=render(<ScalesWithYou />);
    await act(async()=>enter([{isIntersecting:true}]));
    act(()=>vi.advanceTimersByTime(32000));
    const current=()=>container.querySelector('.sws__story:not([hidden])')?.getAttribute('aria-label');
    expect(current()).toBe(CASES[0].kind);
    expect(screen.queryByRole('button',{name:'Pause customer stories'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Previous customer story'}));
    expect(current()).toBe(CASES[9].kind);
    fireEvent.click(screen.getByRole('button',{name:'Next customer story'}));
    expect(current()).toBe(CASES[0].kind);
    expect(container.querySelectorAll('.sws__story')).toHaveLength(10);
    expect(container.querySelector('.sws__card')).toBeNull();
  });
});
