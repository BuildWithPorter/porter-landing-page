const GOOGLE_ADS_ID = "AW-18483356958";
const CHECKLIST_CONVERSION = `${GOOGLE_ADS_ID}/3ut-CPHN8IodEJ7Kxu1E`;
const SALE_READY_HOST = "sale-ready.buildwithporter.com";

type GoogleWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

export function initializeSaleReadyGoogleAds(): void {
  if (typeof window === "undefined" || window.location.hostname !== SALE_READY_HOST) return;
  const googleWindow = window as GoogleWindow;
  if (googleWindow.gtag) return;

  // Reason: Preview and development hosts render this page too. Restrict the
  // Google Ads tag to the production campaign host so QA cannot create ad data.
  googleWindow.dataLayer = googleWindow.dataLayer || [];
  googleWindow.gtag = (...args: unknown[]) => { googleWindow.dataLayer?.push(args); };
  googleWindow.gtag("js", new Date());
  googleWindow.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);
}

export function trackSaleReadyGoogleConversion(): void {
  if (typeof window === "undefined" || window.location.hostname !== SALE_READY_HOST) return;
  // Reason: Only the successful API response represents an accepted checklist
  // request. No email address or form answers are sent to Google.
  (window as GoogleWindow).gtag?.("event", "conversion", { send_to: CHECKLIST_CONVERSION });
}
