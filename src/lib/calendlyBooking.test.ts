import { describe, expect, it } from "vitest";
import { calendlyBookingId } from "./calendlyBooking";

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
const message = (origin: string, uri: string) => ({ origin, data: { event: "calendly.event_scheduled", payload: { invitee: { uri } } } }) as MessageEvent;

describe("confirmed Calendly booking identity", () => {
  // Reason: Duplicated widget messages must produce the same platform dedupe ID.
  it("uses a stable invitee UUID for repeated confirmation messages", () => {
    const event = message("https://calendly.com", `https://api.calendly.com/scheduled_events/${id}/invitees/${id}`);
    expect(calendlyBookingId(event)).toBe(id);
    expect(calendlyBookingId(event)).toBe(id);
  });
  it("rejects foreign origins, lookalike hosts and messages without a booking", () => {
    expect(calendlyBookingId(message("https://evil.test", `https://api.calendly.com/invitees/${id}`))).toBeNull();
    expect(calendlyBookingId(message("https://calendly.com", `https://api.calendly.com.evil.test/invitees/${id}`))).toBeNull();
    expect(calendlyBookingId({ origin: "https://calendly.com", data: { event: "calendly.profile_page_viewed" } } as MessageEvent)).toBeNull();
  });
});
