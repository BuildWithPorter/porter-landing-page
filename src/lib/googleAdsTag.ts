// Shared Google Ads tag for the campaign subdomains (Sale-Ready, Books Cleanup).
export const GOOGLE_ADS_ID = "AW-18483356958";

type GoogleWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

export function initializeGoogleAdsTag(campaignHost: string): void {
  // Reason: Preview and development hosts render these pages too. Restrict the
  // Google Ads tag to the production campaign host so QA cannot create ad data.
  if (typeof window === "undefined" || window.location.hostname !== campaignHost) return;
  const googleWindow = window as GoogleWindow;
  if (googleWindow.gtag) return;

  googleWindow.dataLayer = googleWindow.dataLayer || [];
  // Reason: gtag.js only executes commands pushed as the native `arguments`
  // object. A rest-parameter array looked identical in dataLayer but gtag.js
  // silently ignored it, so no page view or checklist conversion ever reached
  // Google Ads (tag stayed "not verified", 2026-09-29, PR #121). Keep Google's snippet shape.
  googleWindow.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    googleWindow.dataLayer?.push(arguments as unknown as unknown[]);
  };
  googleWindow.gtag("js", new Date());
  googleWindow.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}

export function trackGoogleAdsConversion(campaignHost: string, conversionLabel: string): void {
  if (typeof window === "undefined" || window.location.hostname !== campaignHost) return;
  // Reason: No email address or form answers are sent to Google; the conversion
  // label alone identifies which campaign action happened.
  (window as GoogleWindow).gtag?.("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${conversionLabel}` });
}
