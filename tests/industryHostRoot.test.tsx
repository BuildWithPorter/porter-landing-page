// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://design.buildwithporter.com/"}
import { MemoryRouter } from "react-router-dom";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { routes } from "../src/App";
import { RootPage } from "../src/pages/RootPage";

vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

// Reason (POR-3087): the first subdomain deploy served the Design HTML at "/",
// then the client router hydrated the homepage over it because it only saw the
// path. The root route must choose by hostname in the browser.
it("renders the industry page, not the homepage, at the root of an industry host", () => {
  expect(window.location.hostname).toBe("design.buildwithporter.com");
  const root = routes.find((route) => route.path === "/");
  const html = renderToString(<MemoryRouter>{root?.element}</MemoryRouter>);
  // Reason: The release includes the updated design hero while retaining host-root routing.
  expect(html).toContain("Know what your studio really earned, and what you can pay yourself.");
  // The homepage-only trust strip; the footer tagline appears on every page.
  expect(html).not.toContain("Trusted by");
});

it("renders the multi-entity campaign at the root of its subdomain", () => {
  vi.stubGlobal("location", new URL("https://multi-entity.buildwithporter.com/"));
  const html = renderToString(<MemoryRouter><RootPage home={<p>Homepage</p>} /></MemoryRouter>);
  expect(html).toContain("See your whole business.");
  expect(html).toContain("Every entity. Up to date.");
  expect(html).not.toContain("Homepage");
});
