import { initializeGoogleAdsTag, trackGoogleAdsConversion } from "./googleAdsTag";

const CHECKLIST_CONVERSION_LABEL = "3ut-CPHN8IodEJ7Kxu1E";
const SALE_READY_HOST = "sale-ready.buildwithporter.com";

export function initializeSaleReadyGoogleAds(): void {
  initializeGoogleAdsTag(SALE_READY_HOST);
}

export function trackSaleReadyGoogleConversion(): void {
  // Reason: Only the successful API response represents an accepted checklist request.
  trackGoogleAdsConversion(SALE_READY_HOST, CHECKLIST_CONVERSION_LABEL);
}
