/**
 * Meta Pixel is loaded via a script tag in index.html and attaches
 * `fbq` to window. This declaration lets TypeScript accept calls like
 * `window.fbq?.('track', 'Lead')` without complaining.
 *
 * Optional chaining is required at every call site: the pixel can be
 * blocked by ad blockers, tracking-prevention, or slow to load.
 */

interface Window {
  fbq?: (
    command: "init" | "track" | "trackCustom" | "trackSingle" | "trackSingleCustom",
    eventNameOrPixelId: string,
    params?: Record<string, unknown>,
  ) => void;
}
