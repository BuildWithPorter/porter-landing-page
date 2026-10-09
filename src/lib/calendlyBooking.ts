const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function calendlyBookingId(event: MessageEvent): string | null {
  // Reason: A confirmed invitee identity survives repeated widget messages and
  // page remounts; a random UUID on each message falsely creates new bookings.
  if (event.origin !== "https://calendly.com" || event.data?.event !== "calendly.event_scheduled") return null;
  const uri = event.data?.payload?.invitee?.uri;
  if (typeof uri !== "string") return null;
  try {
    const url = new URL(uri);
    if (url.protocol !== "https:" || url.hostname !== "api.calendly.com") return null;
    return url.pathname.match(new RegExp(`/invitees/(${UUID})$`, "i"))?.[1]?.toLowerCase() || null;
  } catch { return null; }
}
