// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureMarketingAttribution } from "./marketingTracking";
import {
  campaignAnalyticsProperties,
  captureCampaignConversionContext,
  getCampaignConversionContext,
} from "./campaignAttribution";

function clearCookies(): void {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
}

describe("campaign conversion context", () => {
  beforeEach(() => {
    clearCookies();
    window.history.replaceState({}, "", "/sale-ready");
    delete window.fbq;
  });

  it("captures fbclid before a blocked pixel can create _fbc and keeps it after query loss", () => {
    window.history.replaceState({}, "", "/sale-ready?utm_source=meta&utm_medium=paid_social&utm_campaign=fall&fbclid=entry-123");

    const captured = captureCampaignConversionContext();
    expect(window.fbq).toBeUndefined();
    expect(document.cookie).not.toContain("_fbc=");
    expect(captured).toMatchObject({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "fall",
      meta_fbc: expect.stringMatching(/^fb\.1\.\d+\.entry-123$/),
    });

    window.history.replaceState({}, "", "/sale-ready#checklist");
    expect(captureCampaignConversionContext()).toEqual(captured);
    expect(getCampaignConversionContext()).toEqual(captured);
  });

  it("keeps current conversion context separate from immutable first-touch attribution", () => {
    window.history.replaceState({}, "", "/sale-ready?utm_source=meta&utm_campaign=first&fbclid=first-click");
    const firstTouch = captureMarketingAttribution();
    const firstCampaign = captureCampaignConversionContext();

    window.history.replaceState({}, "", "/sale-ready?utm_source=google&utm_medium=cpc&utm_campaign=later&fbclid=later-click");
    const laterCampaign = captureCampaignConversionContext();
    const stillFirstTouch = captureMarketingAttribution();

    expect(laterCampaign).toMatchObject({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "later",
      meta_fbc: expect.stringMatching(/^fb\.1\.\d+\.later-click$/),
    });
    expect(laterCampaign.meta_fbc).not.toBe(firstCampaign.meta_fbc);
    expect(stillFirstTouch.utmSource).toBe(firstTouch.utmSource);
    expect(stillFirstTouch.metaFbc).toBe(firstTouch.metaFbc);
  });

  it("retains the click ID when fbclid is stripped but the full UTM tuple is unchanged", () => {
    window.history.replaceState({}, "", "/sale-ready?utm_source=meta&utm_medium=paid_social&utm_campaign=fall&utm_content=ad-1&utm_term=seller&fbclid=same-click");
    const original = captureCampaignConversionContext();

    window.history.replaceState({}, "", "/sale-ready?utm_source=meta&utm_medium=paid_social&utm_campaign=fall&utm_content=ad-1&utm_term=seller");
    expect(captureCampaignConversionContext().meta_fbc).toBe(original.meta_fbc);

    window.history.replaceState({}, "", "/sale-ready?utm_source=google&utm_medium=cpc&utm_campaign=new-campaign");
    expect(captureCampaignConversionContext().meta_fbc).toBe("");
  });

  it("reuses a valid _fbc for the same fbclid among duplicate host-scope cookies", () => {
    window.history.replaceState({}, "", "/books-cleanup?utm_source=meta&fbclid=current-click");
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    expect(cookie?.configurable).toBe(true);
    const cookieGetter = vi.spyOn(document, "cookie", "get").mockReturnValue(
      "_fbc=fb.2.100.old-click; _fbc=fb.2.200.current-click",
    );

    try {
      const captured = captureCampaignConversionContext();
      expect(captured.meta_fbc).toBe("fb.2.200.current-click");
    } finally {
      cookieGetter.mockRestore();
    }
  });

  it("ignores malformed stored field types without throwing", () => {
    document.cookie = `porter_campaign_conversion_context=${encodeURIComponent(JSON.stringify({
      utm_source: { unexpected: true },
      utm_medium: 123,
      meta_fbp: null,
      meta_fbc: ["fb.2.100.invalid-type"],
    }))}; Path=/`;

    expect(getCampaignConversionContext()).toMatchObject({
      utm_source: "",
      utm_medium: "",
      meta_fbp: "",
      meta_fbc: "",
    });
  });

  it("retains a valid pixel _fbc on a direct return without a stored campaign context", () => {
    document.cookie = "_fbc=fb.2.123456789.direct-return; Path=/";

    expect(getCampaignConversionContext().meta_fbc).toBe("fb.2.123456789.direct-return");
  });

  it("reports ID presence to analytics without exposing the raw IDs", () => {
    window.history.replaceState({}, "", "/sale-ready?utm_source=meta&fbclid=click-789");
    document.cookie = "_fbp=fb.1.123.browser-456; Path=/";
    const analytics = campaignAnalyticsProperties(captureCampaignConversionContext());

    expect(analytics).toMatchObject({ has_meta_click_id: true, has_meta_browser_id: true, utm_source: "meta" });
    expect(analytics).not.toHaveProperty("meta_fbc");
    expect(analytics).not.toHaveProperty("meta_fbp");
  });

  it("truncates UTMs only at Unicode code point boundaries", () => {
    const params = new URLSearchParams();
    params.set("utm_source", `${"x".repeat(117)}😀tail`);
    window.history.replaceState({}, "", `/sale-ready?${params.toString()}`);

    const captured = captureCampaignConversionContext();
    expect(captured.utm_source).toBe("x".repeat(117));
    expect(() => encodeURIComponent(captured.utm_source)).not.toThrow();
  });

  it("sanitizes lone surrogates in stored UTMs without throwing", () => {
    document.cookie = `porter_campaign_conversion_context=${encodeURIComponent(JSON.stringify({
      utm_source: `${"x".repeat(116)}\ud800tail`,
    }))}; Path=/`;

    expect(getCampaignConversionContext().utm_source).toBe(`${"x".repeat(116)}\ufffdtai`);
  });

  it("rejects an array context so it cannot suppress a valid direct-return _fbc", () => {
    document.cookie = `porter_campaign_conversion_context=${encodeURIComponent("[]")}; Path=/`;
    document.cookie = "_fbc=fb.2.123456789.direct-return; Path=/";

    expect(getCampaignConversionContext().meta_fbc).toBe("fb.2.123456789.direct-return");
  });

  it("keeps the complete serialized campaign cookie under the 3,500-byte budget", () => {
    const params = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      params.set(key, "😀".repeat(300));
    }
    const clickId = "c".repeat(280);
    params.set("fbclid", clickId);
    window.history.replaceState({}, "", `/sale-ready?${params.toString()}`);
    const browserId = `fb.2.123.${"b".repeat(291)}`;
    document.cookie = `_fbp=${browserId}; Path=/`;
    const cookieSetter = vi.spyOn(document, "cookie", "set");

    try {
      const captured = captureCampaignConversionContext();
      const assignment = cookieSetter.mock.calls.map(([value]) => value).find((value) => value.startsWith("porter_campaign_conversion_context="));

      expect(assignment).toBeDefined();
      expect(assignment!.length).toBeLessThanOrEqual(3500);
      expect(captured.meta_fbc).toMatch(new RegExp(`^fb\\.1\\.\\d+\\.${clickId}$`));
      expect(captured.meta_fbc.length).toBeLessThanOrEqual(300);
      expect(captured.meta_fbp).toBe(browserId);
      expect(captured.utm_source).toBe("😀".repeat(10) + "");
    } finally {
      cookieSetter.mockRestore();
    }
  });

  it("omits Meta IDs that exceed the server's 300-character limit", () => {
    const params = new URLSearchParams();
    params.set("utm_source", "meta");
    params.set("fbclid", "c".repeat(300));
    window.history.replaceState({}, "", `/sale-ready?${params.toString()}`);
    document.cookie = `_fbp=fb.1.123.${"b".repeat(300)}; Path=/`;

    expect(captureCampaignConversionContext()).toMatchObject({ meta_fbc: "", meta_fbp: "" });
  });
});
