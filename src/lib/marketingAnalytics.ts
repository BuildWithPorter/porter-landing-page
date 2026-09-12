import posthog from "posthog-js";
import { marketingAnalyticsContext } from "./marketingTracking";

export function trackMarketingEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  // Reason: Every marketing event needs the same first-touch context so funnel
  // comparisons remain attributable after a visitor leaves the landing URL.
  // The context helper intentionally returns no fields for direct traffic.
  const context = marketingAnalyticsContext();
  posthog.capture(
    event,
    Object.keys(context).length > 0 ? { ...context, ...properties } : properties,
  );
}
