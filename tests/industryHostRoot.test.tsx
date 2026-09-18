// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://design.buildwithporter.com/"}
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { routes } from "../src/App";

vi.mock("vite-react-ssg", () => ({ Head: () => null }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn(), init: vi.fn() } }));

// Reason (POR-3087): the first subdomain deploy served the Design HTML at "/",
// then the client router hydrated the homepage over it because it only saw the
// path. The root route must choose by hostname in the browser.
it("renders the industry page, not the homepage, at the root of an industry host", () => {
  expect(window.location.hostname).toBe("design.buildwithporter.com");
  const root = routes.find((route) => route.path === "/");
  const html = renderToString(<>{root?.element}</>);
  expect(html).toContain("Know what your studio really earned, and what you can pay yourself.");
  // The homepage-only trust strip; the footer tagline appears on every page.
  expect(html).not.toContain("Trusted by");
});
