import { useEffect, useState, type FormEvent } from "react";
import { Seo } from "../components/Seo";
import { SALE_READY_CHECKLIST } from "../content/saleReadyChecklist";
import { trackMarketingEvent } from "../lib/marketingAnalytics";
import { campaignAnalyticsProperties, captureCampaignConversionContext } from "../lib/campaignAttribution";
import { initializeSaleReadyGoogleAds, trackSaleReadyGoogleConversion } from "../lib/saleReadyGoogleAds";
import "./SaleReady.css";

const TIMEFRAMES = ["In the next 6 months", "6 to 12 months", "12 to 24 months", "Not sure yet"] as const;
const BOOKS_STATUS = ["Up to date", "One or two months behind", "Three or more months behind", "Not sure"] as const;

function Checklist() {
  return (
    <div className="sale-ready-checklist-content">
      <h2>The Sale-Ready Books Checklist</h2>
      <p className="sale-ready-checklist-sub">Ten things a buyer's accountant checks first</p>
      <ol>{SALE_READY_CHECKLIST.map(([title, detail]) => <li key={title}><strong>{title}</strong>{detail && <> {detail}</>}</li>)}</ol>
      <p>Porter cleans up your books in less than 2 weeks and keeps them current until you close.</p>
    </div>
  );
}

export function SaleReadyPage() {
  useEffect(() => { initializeSaleReadyGoogleAds(); }, []);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [booksStatus, setBooksStatus] = useState("");
  // Reason: Keep one ID through retries so an ambiguous response cannot send
  // duplicate checklist and notification emails.
  const [submissionId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const [validationMessage, setValidationMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    // Reason: Every campaign lead question is required before email delivery or
    // conversion tracking; button-based choices need explicit state validation.
    if (!event.currentTarget.reportValidity()) return;
    if (!firstName.trim() || !email.trim() || !business.trim() || !timeframe || !booksStatus) {
      setValidationMessage("Please answer every question before submitting.");
      return;
    }
    setValidationMessage("");
    setStatus("sending");
    // Reason: Form conversions use the captured campaign tuple after internal
    // navigation has removed the original query string.
    const campaign = captureCampaignConversionContext();
    const payload = {
      submission_id: submissionId,
      first_name: firstName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      business: business.trim(),
      timeframe,
      books_status: booksStatus,
      page_url: window.location.href,
      ...campaign,
    };
    try {
      const response = await fetch("/api/sale-ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("delivery_failed");
      // Reason: Lead fires only after the email provider accepts the checklist.
      // The browser and server share this ID for Meta deduplication.
      const receipt = await response.json() as { conversion_eligible?: boolean; meta_delivery?: { status?: string } };
      if (receipt.conversion_eligible !== false) {
        window.fbq?.("track", "Lead", { offer: "sale_ready" }, { eventID: `sale_ready_lead_${submissionId}` });
        trackSaleReadyGoogleConversion(submissionId);
      }
      // Reason: Attribution belongs with the completed lead, while the email
      // address stays only in the private operator notification.
      trackMarketingEvent("sale_ready_checklist_submitted", {
        submission_id: submissionId,
        is_test: receipt.conversion_eligible === false, meta_delivery_status: receipt.meta_delivery?.status || "not_reported",
        timeframe,
        books_status: booksStatus,
        ...campaignAnalyticsProperties(campaign),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return <>
    <Seo title="Sale-Ready Books | Porter" description="Porter cleans up your books in less than 2 weeks and keeps them current until you close." path="/sale-ready" />
    <main className="sale-ready">
      <header className="sale-ready-nav"><a href="https://buildwithporter.com/" aria-label="Porter home">Porter</a><a href="#checklist">Get the checklist</a></header>
      <section className="sale-ready-hero">
        <div className="sale-ready-hero-inner">
          <span className="sale-ready-eyebrow">For owners getting ready to sell</span>
          <h1>Books that hold up<br />when a buyer looks.</h1>
          <p>Porter cleans up your books in less than 2 weeks and keeps them current until you close, so diligence starts from numbers you can stand behind.</p>
          <div className="sale-ready-actions"><a className="sale-ready-button" href="#checklist">Get the free checklist</a><a className="sale-ready-secondary" href="#what-we-do">See what Porter does</a></div>
        </div>
        <div className="sale-ready-hero-art" aria-hidden="true"><img src="/sale-ready/creative-01.png" alt="" /></div>
      </section>
      <section className="sale-ready-form-section" id="checklist"><div className="sale-ready-container sale-ready-form-grid"><div><span className="sale-ready-eyebrow">A practical place to start</span><h2>The Sale-Ready Books Checklist</h2><p>Ten things a buyer's accountant checks first. Free, one page. Enter your name and email to get it. Answer the questions about your books so we can tailor your recommendation.</p></div>{status === "sent" ? <div className="sale-ready-thanks" role="status"><p className="sale-ready-success">Your checklist is on its way to your inbox. I’ll be in touch personally.</p><Checklist /></div> : <form onSubmit={submit}>
              <label>First name<input required value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" maxLength={120} /></label>
              <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={320} /></label>
              <label>Business name or website<input required value={business} onChange={e => setBusiness(e.target.value)} autoComplete="organization" maxLength={200} /></label>
              <div className="sale-ready-extra">
                <div className="sale-ready-extra-fields"><fieldset className="sale-ready-choices" aria-required="true"><legend>When are you thinking of selling?</legend>{TIMEFRAMES.map(value => <button key={value} type="button" aria-pressed={timeframe === value} onClick={() => setTimeframe(value)}>{value}</button>)}</fieldset><fieldset className="sale-ready-choices" aria-required="true"><legend>How far behind are your books?</legend>{BOOKS_STATUS.map(value => <button key={value} type="button" aria-pressed={booksStatus === value} onClick={() => setBooksStatus(value)}>{value}</button>)}</fieldset></div>
              </div>
              <label>Phone (optional), so we can call instead of email<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" maxLength={40} /></label>
              <button className="sale-ready-button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send me the checklist"}</button>
              {validationMessage && <p role="alert">{validationMessage}</p>}
              {status === "error" && <p role="alert">We couldn't send the checklist. Please try again.</p>}
              <small>No card, no login, no meeting required.</small>
            </form>}</div></section>
      <section className="sale-ready-story"><div className="sale-ready-container"><span className="sale-ready-eyebrow">The problem</span><h2>Paying for bookkeeping isn't the same as having your books done.</h2><p>Most owners can afford a bookkeeper. The books still slip, because they are never the most urgent thing in the building. We meet owners who pay someone every month and are three months behind, and owners who leave everything until year-end. Nobody notices until a buyer's accountant asks for monthly numbers that tie to the bank and the tax returns.</p></div></section>
      <section className="sale-ready-work" id="what-we-do"><div className="sale-ready-container"><span className="sale-ready-eyebrow">What we do</span><div className="sale-ready-steps"><article><span>01</span><h3>Clean up.</h3><p>Every bank and card account reconciled. Categories fixed. Missing months caught up. The books tied to your bank statements and your filed tax returns.</p></article><article><span>02</span><h3>Keep it current.</h3><p>A monthly close, so the numbers stay right through the letter of intent, diligence and closing.</p></article><article><span>03</span><h3>Stay on after the sale, if you want us to.</h3><p>The same team can run the books for you or for the new owner.</p></article></div><div className="sale-ready-notes"><p><strong>How long it takes.</strong> Less than 2 weeks from the day we have access to your books and your documents. We tell you exactly what we need.</p><p><strong>What we don't do.</strong> We don't sell a quality of earnings report, and we don't certify anything. We get your books into the shape a buyer's accountant expects to find them in.</p></div></div></section>
      <footer className="sale-ready-footer"><div className="sale-ready-container"><h2>Selling your business?<br />Let's get your books ready first.</h2><a className="sale-ready-button" href="#checklist">Get the checklist</a><p>Porter</p></div></footer>
    </main>
  </>;
}
