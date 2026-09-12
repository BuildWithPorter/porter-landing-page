export type MarketingAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  metaFbc: string | null;
  metaFbp: string | null;
  landingPath: string | null;
  referrer: string | null;
  capturedAt: string | null;
};

const ATTRIBUTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const COOKIE_NAMES = {
  utmSource: "porter_utm_source",
  utmMedium: "porter_utm_medium",
  utmCampaign: "porter_utm_campaign",
  metaFbc: "porter_meta_fbc",
  metaFbp: "porter_meta_fbp",
  landingPath: "porter_landing_path",
  referrer: "porter_landing_referrer",
  capturedAt: "porter_attribution_captured_at",
} as const;

function readCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  return document.cookie.split(";").reduce((cookies, rawCookie) => {
    const separator = rawCookie.indexOf("=");
    if (separator < 0) return cookies;
    const key = rawCookie.slice(0, separator).trim();
    const value = rawCookie.slice(separator + 1);
    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        // Reason: A malformed third-party cookie must not prevent the audit
        // page from capturing the valid first-party attribution beside it.
        cookies[key] = value;
      }
    }
    return cookies;
  }, {} as Record<string, string>);
}

function clean(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 512) : null;
}

function safeReferrer(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    return `${url.origin}${url.pathname}`.slice(0, 1024);
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string | null): void {
  if (typeof document === "undefined" || !value) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${
    window.location.protocol === "https:" ? "; Secure" : ""
  }`;
}

function readStoredAttribution(cookies: Record<string, string>): MarketingAttribution {
  return {
    utmSource: clean(cookies[COOKIE_NAMES.utmSource]),
    utmMedium: clean(cookies[COOKIE_NAMES.utmMedium]),
    utmCampaign: clean(cookies[COOKIE_NAMES.utmCampaign]),
    metaFbc: clean(cookies[COOKIE_NAMES.metaFbc] || cookies["_fbc"]),
    metaFbp: clean(cookies[COOKIE_NAMES.metaFbp] || cookies["_fbp"]),
    landingPath: clean(cookies[COOKIE_NAMES.landingPath]),
    referrer: clean(cookies[COOKIE_NAMES.referrer]),
    capturedAt: clean(cookies[COOKIE_NAMES.capturedAt]),
  };
}

function hasAttribution(value: MarketingAttribution): boolean {
  return Boolean(
    value.utmSource || value.utmMedium || value.utmCampaign || value.metaFbc || value.metaFbp,
  );
}

export function captureMarketingAttribution(): MarketingAttribution {
  if (typeof window === "undefined") {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      metaFbc: null,
      metaFbp: null,
      landingPath: null,
      referrer: null,
      capturedAt: null,
    };
  }

  const cookies = readCookies();
  const stored = readStoredAttribution(cookies);
  const params = new URLSearchParams(window.location.search);
  const fbclid = clean(params.get("fbclid"));
  const freshFbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
  const current = {
    // Reason: Attribution is first-touch, so a later campaign URL must not
    // rewrite any part of the original source/medium/campaign tuple.
    utmSource: stored.utmSource || clean(params.get("utm_source")),
    utmMedium: stored.utmMedium || clean(params.get("utm_medium")),
    utmCampaign: stored.utmCampaign || clean(params.get("utm_campaign")),
    // Reason: First-touch attribution must retain the original Meta click;
    // replacing it on every route would credit a later internal navigation.
    metaFbc: stored.metaFbc || freshFbc,
    metaFbp: stored.metaFbp,
    landingPath: stored.landingPath || window.location.pathname,
    referrer: stored.referrer || safeReferrer(),
    capturedAt: stored.capturedAt || new Date().toISOString(),
  } satisfies MarketingAttribution;

  if (!stored.utmSource && current.utmSource) writeCookie(COOKIE_NAMES.utmSource, current.utmSource);
  if (!stored.utmMedium && current.utmMedium) writeCookie(COOKIE_NAMES.utmMedium, current.utmMedium);
  if (!stored.utmCampaign && current.utmCampaign) writeCookie(COOKIE_NAMES.utmCampaign, current.utmCampaign);
  if (!stored.metaFbc && current.metaFbc) writeCookie(COOKIE_NAMES.metaFbc, current.metaFbc);
  if (!stored.metaFbp && current.metaFbp) writeCookie(COOKIE_NAMES.metaFbp, current.metaFbp);
  if (!stored.landingPath && current.landingPath) writeCookie(COOKIE_NAMES.landingPath, current.landingPath);
  if (!stored.referrer && current.referrer) writeCookie(COOKIE_NAMES.referrer, current.referrer);
  if (!stored.capturedAt && current.capturedAt) writeCookie(COOKIE_NAMES.capturedAt, current.capturedAt);
  return current;
}

export function getMarketingAttribution(): MarketingAttribution {
  return readStoredAttribution(readCookies());
}

export function marketingAnalyticsContext(): Record<string, string | boolean | null> {
  const attribution = captureMarketingAttribution();
  if (!hasAttribution(attribution)) return {};
  return {
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    landing_path: attribution.landingPath,
    landing_referrer: attribution.referrer,
    has_meta_click_id: Boolean(attribution.metaFbc),
    has_meta_browser_id: Boolean(attribution.metaFbp),
  };
}

export function hasMarketingAttribution(value: MarketingAttribution): boolean {
  return hasAttribution(value);
}
