import { isPrimaryMarketingHost } from "./metaPixel";

// Reason: "Porter website" data source in OpenAI Ads Manager (Porter Agents, Inc.),
// created 2026-11-02 to measure the ChatGPT ads campaign porter_chatgpt_test_nov26.
const OPENAI_PIXEL_ID = "5KsEYDCE3QzhQSpcXUZRad";
const OPENAI_PIXEL_SOURCE = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

type OpenAiPixelQueue = NonNullable<Window["oaiq"]> & { q: unknown[][] };

export function initializeOpenAiPixel(hostname?: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  // Reason: Same production-host boundary as the Meta pixel, so previews and
  // dev-landing never count as ChatGPT ad traffic.
  if (!isPrimaryMarketingHost(hostname ?? window.location.hostname)) return false;
  if (window.oaiq) return true;

  const queue = function (...args: unknown[]) {
    queue.q.push(args);
  } as OpenAiPixelQueue;
  queue.q = [];
  window.oaiq = queue;

  const script = document.createElement("script");
  script.async = true;
  script.src = OPENAI_PIXEL_SOURCE;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);

  window.oaiq("init", { pixelId: OPENAI_PIXEL_ID });
  return true;
}

// Reason: event_id reuses the Meta eventID so a later Conversions API sender
// can deduplicate against the browser event.
export function trackOpenAiLead(eventId: string): void {
  window.oaiq?.("measure", "lead_created", { type: "customer_action" }, { event_id: eventId });
}
