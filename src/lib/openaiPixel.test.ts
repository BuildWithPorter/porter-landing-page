// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { initializeOpenAiPixel, trackOpenAiLead } from "./openaiPixel";

afterEach(() => {
  delete window.oaiq;
  document.querySelectorAll('script[src*="bzrcdn.openai.com"]').forEach((node) => node.remove());
});

describe("OpenAI pixel", () => {
  it("does not initialize from a non-production test host", () => {
    expect(initializeOpenAiPixel()).toBe(false);
    expect(window.oaiq).toBeUndefined();
    trackOpenAiLead("ignored");
    expect(document.querySelector('script[src*="bzrcdn.openai.com"]')).toBeNull();
  });

  it("queues init and lead events on production hosts", () => {
    expect(initializeOpenAiPixel("books-cleanup.buildwithporter.com")).toBe(true);
    trackOpenAiLead("waitlist_lead_abc");
    expect(document.querySelector('script[src*="bzrcdn.openai.com"]')).not.toBeNull();
    expect((window.oaiq as NonNullable<Window["oaiq"]> & { q: unknown[][] }).q).toEqual([
      ["init", { pixelId: "5KsEYDCE3QzhQSpcXUZRad" }],
      ["measure", "lead_created", { type: "customer_action" }, { event_id: "waitlist_lead_abc" }],
    ]);
  });
});
