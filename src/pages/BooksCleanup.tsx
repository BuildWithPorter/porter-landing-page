import { calendlyBookingId } from "../lib/calendlyBooking";
import { useEffect, useState, type FormEvent } from "react";
import { Seo } from "../components/Seo";
import {
  BOOKS_BEHIND_OPTIONS,
  BOOKS_CLEANUP_CHECKLIST,
  BOOKS_CLEANUP_CHECKLIST_FOOTER,
  BOOKS_CLEANUP_CHECKLIST_SUBTITLE,
  BOOKS_CLEANUP_CHECKLIST_TITLE,
} from "../content/booksCleanupChecklist";
import { PORTER_DEMO_CALENDLY_URL, openCalendlyPopup } from "../lib/calendly";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import { initializeBooksCleanupGoogleAds, trackBooksCleanupGoogleConversion } from "../lib/booksCleanupGoogleAds";
// Reason: Books Cleanup is the same campaign template as Sale-Ready. It reuses
// Sale-Ready's stylesheet so the two pages cannot drift visually, and adds only
// the few rules Sale-Ready has no equivalent for in BooksCleanup.css.
import "./SaleReady.css";
import "./BooksCleanup.css";

// Reason: offer separates this campaign from Sale-Ready in the shared Meta
// dataset, Google Ads account and PostHog project.
const OFFER = "books_cleanup";

function currentUtms(): Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
  };
}

function metaCookies() {
  return {
    meta_fbp: document.cookie.match(/(?:^|; )_fbp=([^;]*)/)?.[1] || "",
    meta_fbc: document.cookie.match(/(?:^|; )_fbc=([^;]*)/)?.[1] || "",
  };
}

function BookCallButton({ placement }: { placement: string }) {
  return (
    <button
      className="sale-ready-button"
      type="button"
      data-placement={placement}
      onClick={() => { void openCalendlyPopup(PORTER_DEMO_CALENDLY_URL); }}
    >
      Book 15 minutes
    </button>
  );
}

function Checklist() {
  return (
    <div className="sale-ready-checklist-content">
      <h2>{BOOKS_CLEANUP_CHECKLIST_TITLE}</h2>
      <p className="sale-ready-checklist-sub">{BOOKS_CLEANUP_CHECKLIST_SUBTITLE}</p>
      <ol>{BOOKS_CLEANUP_CHECKLIST.map(([title, detail]) => <li key={title}><strong>{title}</strong>{detail && <> {detail}</>}</li>)}</ol>
      <p>{BOOKS_CLEANUP_CHECKLIST_FOOTER}</p>
    </div>
  );
}

export function BooksCleanupPage() {
  useEffect(() => { initializeBooksCleanupGoogleAds(); }, []);

  useEffect(() => {
    // Reason: Calendly posts calendly.event_scheduled only after a time is
    // actually booked (same signal WaitlistDialog relies on). Every Book button
    // on this page opens the same popup, so one page-level listener reports the
    // Schedule conversion once per booking. Calendly’s stable invitee ID is shared by
    // fbq and the server-side CAPI call so Meta counts one Schedule, not two.
    // Reason: Repeated widget messages must not count one time slot twice.
    const seenBookings = new Set<string>();
    const onCalendlyMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://calendly.com" ||
        !event.data ||
        typeof event.data !== "object" ||
        event.data.event !== "calendly.event_scheduled"
      ) return;
      const bookingId = calendlyBookingId(event);
      if (!bookingId || seenBookings.has(bookingId)) return;
      seenBookings.add(bookingId);
      const utms = currentUtms();
      window.fbq?.("track", "Schedule", { offer: OFFER }, { eventID: `books_cleanup_schedule_${bookingId}` });
      trackBooksCleanupGoogleConversion("callBooked", `books_cleanup_schedule_${bookingId}`);
      trackMarketingEvent("books_cleanup_call_booked", { offer: OFFER, booking_id: bookingId, ...utms });
      void fetch("/api/books-cleanup-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, page_url: window.location.href, ...metaCookies() }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("message", onCalendlyMessage);
    return () => window.removeEventListener("message", onCalendlyMessage);
  }, []);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [booksBehind, setBooksBehind] = useState("");
  // Reason: Keep one ID through retries so an ambiguous response cannot send
  // duplicate checklist and notification emails (Resend Idempotency-Key).
  const [submissionId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const utms = currentUtms();
    const payload = {
      submission_id: submissionId,
      first_name: firstName.trim(),
      email: email.trim(),
      books_behind: booksBehind,
      page_url: window.location.href,
      ...utms,
      ...metaCookies(),
    };
    try {
      const response = await fetch("/api/books-cleanup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("delivery_failed");
      // Reason: Lead fires only after the email provider accepts the checklist.
      // The browser and server share this ID for Meta deduplication.
      // Reason: Delivery tests still exercise the form, but the server decides
      // whether the address is eligible to count as an acquired prospect.
      const receipt = await response.json() as { conversion_eligible?: boolean };
      if (receipt.conversion_eligible !== false) {
        window.fbq?.("track", "Lead", { offer: OFFER }, { eventID: `books_cleanup_lead_${submissionId}` });
        trackBooksCleanupGoogleConversion("checklistSubmitted", submissionId);
      }
      // Reason: Attribution belongs with the completed lead, while the name and
      // email stay only in the private operator notification.
      trackMarketingEvent("books_cleanup_checklist_submitted", { offer: OFFER, submission_id: submissionId, is_test: receipt.conversion_eligible === false, books_behind: booksBehind, ...utms });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return <>
    <Seo
      title="Books Cleanup | Porter"
      description="Behind on your books? Porter catches them up in less than 2 weeks, then keeps them current every month after."
      path="/books-cleanup"
    />
    <main className="sale-ready books-cleanup">
      <header className="sale-ready-nav"><a href="https://buildwithporter.com/" aria-label="Porter home">Porter</a><a href="#checklist">Get the checklist</a></header>
      <section className="sale-ready-hero">
        <div className="sale-ready-hero-inner">
          <h1>Behind on your books? We catch them up in less than 2 weeks.</h1>
          <p>Porter reconciles every bank and card account, fixes categories and fills in the missing months before year-end, then keeps your books current every month after.</p>
          <div className="sale-ready-actions"><a className="sale-ready-button" href="#checklist">Get the free checklist</a><a className="sale-ready-secondary" href="#what-we-do">See how we help</a></div>
        </div>
        <div className="sale-ready-hero-art" aria-hidden="true"><img src="/books-cleanup/yec-img-02.jpg" alt="" /></div>
      </section>
      <section className="sale-ready-form-section" id="checklist"><div className="sale-ready-container sale-ready-form-grid"><div><h2>{BOOKS_CLEANUP_CHECKLIST_TITLE}</h2><p>Eight things to have in order before your accountant asks for the books. Free, one page. Enter your name and email to get it.</p></div>{status === "sent" ? <div className="sale-ready-thanks" role="status"><p className="sale-ready-success">Your checklist is on its way to your inbox.</p><Checklist /><div className="books-cleanup-thanks-cta"><p>Want us to look at where your books stand? Book 15 minutes.</p><BookCallButton placement="thank_you" /></div></div> : <form onSubmit={submit}>
              <label>First name<input required value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" maxLength={120} /></label>
              <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={320} /></label>
              <details className="sale-ready-extra">
                <summary>Add details for a recommendation (optional)</summary>
                <div className="sale-ready-extra-fields"><fieldset className="sale-ready-choices"><legend>How far behind are your books?</legend>{BOOKS_BEHIND_OPTIONS.map(value => <button key={value} type="button" aria-pressed={booksBehind === value} onClick={() => setBooksBehind(value)}>{value}</button>)}</fieldset></div>
              </details>
              <button className="sale-ready-button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send me the checklist"}</button>
              {status === "error" && <p role="alert">We couldn't send the checklist. Please try again.</p>}
              <small>No card, no login, no meeting required.</small>
            </form>}</div></section>
      <section className="sale-ready-story"><div className="sale-ready-container"><h2>Paying for bookkeeping isn't the same as having your books done.</h2><p>Most owners pay for bookkeeping and assume that means the books are done. Nobody checks until year-end, when the accountant asks for clean numbers and the gaps show up all at once. By then it's months of catch-up on a deadline.</p></div></section>
      <section className="sale-ready-work" id="what-we-do"><div className="sale-ready-container"><span className="sale-ready-eyebrow">What we do</span><div className="sale-ready-steps books-cleanup-steps"><article><span>01</span><h3>Catch up.</h3><p>Every bank and card account reconciled. Categories fixed. Missing months filled in. Nothing left in "uncategorized." Loans and equipment recorded properly.</p></article><article><span>02</span><h3>Keep it current.</h3><p>A monthly close, so the books never fall behind again and you start every month knowing where you stand.</p></article></div><div className="sale-ready-notes"><p><strong>How long it takes.</strong> Less than 2 weeks from the day we have access to your books and your documents, whether you're two months behind or several years. We tell you on the first call exactly what we need.</p><p><strong>What we don't do.</strong> We don't prepare tax returns, and we don't replace your accountant. We hand them books they can work from.</p></div></div></section>
      <footer className="sale-ready-footer"><div className="sale-ready-container"><h2>Get your books caught up before year-end.</h2><a className="sale-ready-button" href="#checklist">Get the free checklist</a></div>
        {/* Reason: Campaign hosts serve only this page, so legal links must be absolute to the apex, matching the main site footer's Legal column. */}
        <nav className="books-cleanup-legal" aria-label="Legal">
          <a href="https://buildwithporter.com/privacy-policy">Privacy Policy</a>
          <a href="https://buildwithporter.com/terms-of-service">Terms and Conditions</a>
          <a href="https://buildwithporter.com/legal/subprocessors">Sub-processors</a>
          <a href="https://buildwithporter.com/security">Security</a>
        </nav>
      </footer>
    </main>
  </>;
}
