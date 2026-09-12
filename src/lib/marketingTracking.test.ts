// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  captureMarketingAttribution,
  getMarketingAttribution,
  hasMarketingAttribution,
  marketingAnalyticsContext,
} from "./marketingTracking";

describe("marketing attribution", () => {
  beforeEach(() => {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
    window.history.replaceState({}, "", "/financial-health-audit");
  });

  it("captures Meta click and UTM context once for later audit requests", () => {
    window.history.replaceState(
      {},
      "",
      "/financial-health-audit?utm_source=meta&utm_medium=paid_social&utm_campaign=fall&fbclid=click-123",
    );

    const captured = captureMarketingAttribution();
    expect(captured).toMatchObject({
      utmSource: "meta",
      utmMedium: "paid_social",
      utmCampaign: "fall",
      metaFbc: expect.stringMatching(/^fb\.1\.\d+\.click-123$/),
      landingPath: "/financial-health-audit",
    });
    expect(getMarketingAttribution()).toMatchObject(captured);
    expect(marketingAnalyticsContext()).toMatchObject({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "fall",
      has_meta_click_id: true,
    });
    expect(hasMarketingAttribution(captured)).toBe(true);
  });

  it("restores medium-only campaigns instead of dropping valid attribution", () => {
    window.history.replaceState({}, "", "/financial-health-audit?utm_medium=paid_social");
    const captured = captureMarketingAttribution();
    expect(captured.utmMedium).toBe("paid_social");
    expect(hasMarketingAttribution(captured)).toBe(true);
  });

  it("keeps the first Meta click when a later page has another campaign", () => {
    window.history.replaceState({}, "", "/financial-health-audit?utm_source=meta&fbclid=first");
    const first = captureMarketingAttribution();
    window.history.replaceState({}, "", "/financial-health-audit?utm_source=other&fbclid=second");
    const second = captureMarketingAttribution();
    expect(second.metaFbc).toBe(first.metaFbc);
    expect(second.utmSource).toBe("meta");
  });
});
