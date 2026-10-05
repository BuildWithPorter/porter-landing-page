// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://sale-ready.buildwithporter.com/sale-ready"}
import { describe, expect, it } from "vitest";
import { initializeSaleReadyGoogleAds, trackSaleReadyGoogleConversion } from "./saleReadyGoogleAds";

describe("Sale-Ready Google Ads tag", () => {
  it("queues commands as native Arguments objects that gtag.js executes", () => {
    initializeSaleReadyGoogleAds();
    trackSaleReadyGoogleConversion();
    const queued = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    // Reason: gtag.js ignores plain arrays; this regressed silently once (2026-09-29).
    expect(queued.map((entry) => Object.prototype.toString.call(entry))).toEqual([
      "[object Arguments]", "[object Arguments]", "[object Arguments]",
    ]);
    expect(Array.from(queued[2] as ArrayLike<unknown>)).toEqual([
      "event", "conversion", { send_to: "AW-18483356958/3ut-CPHN8IodEJ7Kxu1E" },
    ]);
  });
});
