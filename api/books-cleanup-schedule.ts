import { isSubmissionId, safeText, sendMetaEvent, visitorIp } from "../server/checklistLead.js";

// Reason: Meta's browser pixel is lossy (blockers, iOS), so a completed Calendly
// booking is also reported server side. The browser sends the same event ID it
// gave fbq, so Meta deduplicates the pair into one Schedule. No name or email is
// sent here: Calendly's postMessage does not expose them, and we do not ask.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || !isSubmissionId(body.booking_id)) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    await sendMetaEvent({
      eventName: "Schedule",
      eventId: `books_cleanup_schedule_${body.booking_id}`,
      eventSourceUrl: safeText(body.page_url, 1000) || "https://books-cleanup.buildwithporter.com/",
      visitorIp: visitorIp(request),
      userAgent: request.headers.get("user-agent") || "",
      fbp: safeText(body.meta_fbp, 300),
      fbc: safeText(body.meta_fbc, 300),
      customData: { offer: "books_cleanup" },
    }, "Books Cleanup");
  } catch (error) { console.error("Books Cleanup Meta CAPI unavailable", error); }
  return Response.json({ ok: true });
}

export const config = { runtime: "edge" };
