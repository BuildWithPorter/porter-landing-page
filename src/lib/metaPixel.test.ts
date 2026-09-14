// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { initializeMetaPixel, isPrimaryMarketingHost } from "./metaPixel";

afterEach(() => {
  delete window.fbq;
  document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((node) => node.remove());
});

describe("Meta pixel host boundary", () => {
  it("allows only the primary marketing hosts", () => {
    expect(isPrimaryMarketingHost("buildwithporter.com")).toBe(true);
    expect(isPrimaryMarketingHost("www.buildwithporter.com")).toBe(true);
    expect(isPrimaryMarketingHost("dev-landing.buildwithporter.com")).toBe(false);
    expect(isPrimaryMarketingHost("porter-git-preview.vercel.app")).toBe(false);
    expect(isPrimaryMarketingHost("localhost")).toBe(false);
  });

  it("does not initialize from a non-production test host", () => {
    expect(window.location.hostname).toBe("localhost");
    expect(initializeMetaPixel()).toBe(false);
    expect(window.fbq).toBeUndefined();
    expect(document.querySelector('script[src*="connect.facebook.net"]')).toBeNull();
  });

  it("queues the production initialization and page view", () => {
    expect(initializeMetaPixel("buildwithporter.com")).toBe(true);
    expect(window.fbq).toBeDefined();
    expect(document.querySelector('script[src*="connect.facebook.net"]')).not.toBeNull();
    expect((window.fbq as NonNullable<Window["fbq"]> & { queue: unknown[][] }).queue).toEqual([
      ["init", "1383684593949468"],
      ["track", "PageView"],
    ]);
  });
});
