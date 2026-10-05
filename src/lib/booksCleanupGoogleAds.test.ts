// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://books-cleanup.buildwithporter.com/"}
import { describe, expect, it } from "vitest";
import {
  initializeBooksCleanupGoogleAds,
  trackBooksCleanupGoogleConversion,
} from "./booksCleanupGoogleAds";

describe("Books Cleanup Google Ads tag", () => {
  it("queues native Arguments objects and sends each conversion to its own label", () => {
    initializeBooksCleanupGoogleAds();
    trackBooksCleanupGoogleConversion("checklistSubmitted");
    trackBooksCleanupGoogleConversion("callBooked");
    const queued = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    // Reason: gtag.js ignores plain arrays; this regressed silently once (2026-09-29, PR #121).
    expect(queued.map((entry) => Object.prototype.toString.call(entry))).toEqual(Array(4).fill("[object Arguments]"));
    expect(Array.from(queued[2] as ArrayLike<unknown>)).toEqual([
      "event", "conversion", { send_to: "AW-18483356958/uIbnCImB8IsdEJ7Kxu1E" },
    ]);
    expect(Array.from(queued[3] as ArrayLike<unknown>)).toEqual([
      "event", "conversion", { send_to: "AW-18483356958/_apICIyB8IsdEJ7Kxu1E" },
    ]);
  });
});
