import { initializeGoogleAdsTag, trackGoogleAdsConversion } from "./googleAdsTag";

export const BOOKS_CLEANUP_HOST = "books-cleanup.buildwithporter.com";

// Reason: Books Cleanup reports two separate Google Ads conversions on the same
// AW account as Sale-Ready, so bidding can optimize for either action.
// Conversion actions in Google Ads: "YEC Checklist submitted" and "YEC Call booked".
export const BOOKS_CLEANUP_GOOGLE_ADS_CONVERSION_LABELS = {
  checklistSubmitted: "uIbnCImB8IsdEJ7Kxu1E",
  callBooked: "_apICIyB8IsdEJ7Kxu1E",
} as const;

export function initializeBooksCleanupGoogleAds(): void {
  initializeGoogleAdsTag(BOOKS_CLEANUP_HOST);
}

export function trackBooksCleanupGoogleConversion(action: keyof typeof BOOKS_CLEANUP_GOOGLE_ADS_CONVERSION_LABELS): void {
  trackGoogleAdsConversion(BOOKS_CLEANUP_HOST, BOOKS_CLEANUP_GOOGLE_ADS_CONVERSION_LABELS[action]);
}
