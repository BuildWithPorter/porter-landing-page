import { useEffect, useState } from "react";
import "./PorterAIApp.css";
import "./SoftwareDemoChart.css";
import "./SoftwareDemoProactive.css";

const SIDEBAR_ITEMS = [
  { icon: "auto_awesome", active: true },
  { icon: "grid_view" },
  { icon: "table_chart" },
  { icon: "calendar_today" },
  { icon: "task_alt" },
  { icon: "description" },
  { icon: "bar_chart" },
];
const SIDEBAR_SETTINGS = [{ icon: "search" }, { icon: "memory" }, { icon: "settings" }];

const INVOICE_LINES = [
  { desc: "Spring lawn cleanup",                qty: 1, rate: 850, amount: 850 },
  { desc: "Hedge trimming (front + back)",      qty: 1, rate: 650, amount: 650 },
  { desc: "Fertilization & weed control",       qty: 1, rate: 475, amount: 475 },
  { desc: "Mulch installation · 3 yards",       qty: 3, rate: 175, amount: 525 },
];

const PAST_DUE = [
  { customer: "Mark Sullivan",  invoice: "INV-2138", amount: 1400, due: "Apr 7, 2026",  age: 38 },
  { customer: "Jenna Wallace",  invoice: "INV-2141", amount: 950,  due: "Apr 12, 2026", age: 33 },
  { customer: "Carlos Mendez",  invoice: "INV-2147", amount: 3200, due: "Apr 22, 2026", age: 23 },
];

const fmtUSD = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function SoftwareDemoProactive() {
  /* Steps
     1  Porter intro (estimate → job, drafted an invoice)
     2  draft invoice card appears
     3  user: "Looks good. Proceed."
     4  Porter: sent confirmation
     5  Porter: follow-up about 3 past-due invoices
     6  past-due list table
     7  user: "Yes, send reminders."
     8  Porter: reminders sent confirmation
  */
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) {
      setStep(8);
      return;
    }
    setStep(0);
    const schedule: Array<[number, number]> = [
      [500, 1],
      [1500, 2],
      [3000, 3],
      [3800, 4],
      [4800, 5],
      [5600, 6],
      [7000, 7],
      [7800, 8],
    ];
    const timers = schedule.map(([t, s]) => window.setTimeout(() => setStep(s), t));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reduced]);

  return (
    <div className="pa pa--demo">
      <aside className="pa__sidebar" aria-label="Porter app navigation">
        <div className="pa__sidebar-brand"><img src="/porter-icon.svg" alt="" /></div>
        <nav className="pa__sidebar-nav">
          {SIDEBAR_ITEMS.map((it, i) => (
            <div key={i} className={`pa__sidebar-row ${it.active ? "is-active" : ""}`}>
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>
        <div className="pa__sidebar-divider" />
        <nav className="pa__sidebar-nav">
          {SIDEBAR_SETTINGS.map((it, i) => (
            <div key={i} className="pa__sidebar-row">
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>
        <div className="pa__sidebar-user"><span className="pa__sidebar-avatar">M</span></div>
      </aside>

      <section className="pa__main">
        <header className="pa__topbar">
          <div className="pa__topbar-left">
            <span className="material-symbols-outlined pa__topbar-icon">menu</span>
            <div className="pa__workspace">
              <span className="pa__workspace-mark">AC</span>
              <span className="pa__workspace-name">Acme Landscaping</span>
              <span className="pa__workspace-tag">QBO</span>
              <span className="material-symbols-outlined pa__workspace-chev">expand_more</span>
            </div>
          </div>
          <div className="pa__search">
            <span className="material-symbols-outlined pa__search-icon">search</span>
            <span className="pa__search-placeholder">Search transactions...</span>
          </div>
          <div className="pa__topbar-right">
            <div className="pa__toggle">
              <span className="pa__toggle-dot" />
              <span className="pa__toggle-label">Ask before acting</span>
            </div>
            <button className="pa__new-chat" type="button">
              <span className="material-symbols-outlined">add</span>
              New chat
            </button>
            <button className="pa__history" type="button">
              <span className="material-symbols-outlined">history</span>
              History
            </button>
          </div>
        </header>

        <div className="pa__body">
          <div className="sdc">
            <div className="sdc__scroll">
              {/* Porter intro: estimate turned into a job */}
              {step >= 1 && (
                <div className="pa__ai">
                  <div className="pa__ai-head pa__fade">
                    <span className="pa__ai-mark"><img src="/porter-icon.svg" alt="" /></span>
                    <span className="pa__ai-name">Porter</span>
                    <span className="pa__ai-tag">heads up</span>
                  </div>
                  <div className="pa__ai-section pa__fade">
                    <p className="pa__ai-intro">
                      Your estimate for <strong>Adam Smith</strong> turned into a job — congrats. I drafted the invoice. Want me to send it?
                    </p>
                  </div>

                  {step >= 2 && (
                    <div className="pa__ai-section pa__fade">
                      <InvoiceDraft />
                    </div>
                  )}
                </div>
              )}

              {step >= 3 && (
                <div className="pa__user">
                  <div className="pa__user-bubble">Looks good. Proceed.</div>
                </div>
              )}

              {step >= 4 && (
                <div className="pa__ai">
                  <div className="pa__ai-head pa__fade">
                    <span className="pa__ai-mark"><img src="/porter-icon.svg" alt="" /></span>
                    <span className="pa__ai-name">Porter</span>
                  </div>
                  <div className="pa__ai-section pa__fade">
                    <SentChip
                      icon="outgoing_mail"
                      label="Invoice sent"
                      detail="adam.smith@gmail.com · INV-2154 · $2,500"
                    />
                  </div>

                  {step >= 5 && (
                    <div className="pa__ai-section pa__fade pa__ai-followup">
                      <p className="pa__ai-intro">
                        While I have you — <strong>3 invoices are past due</strong>. Want me to send reminder emails?
                      </p>
                    </div>
                  )}

                  {step >= 6 && (
                    <div className="pa__ai-section pa__fade">
                      <PastDueList />
                    </div>
                  )}
                </div>
              )}

              {step >= 7 && (
                <div className="pa__user">
                  <div className="pa__user-bubble">Yes, send the reminders.</div>
                </div>
              )}

              {step >= 8 && (
                <div className="pa__ai">
                  <div className="pa__ai-head pa__fade">
                    <span className="pa__ai-mark"><img src="/porter-icon.svg" alt="" /></span>
                    <span className="pa__ai-name">Porter</span>
                  </div>
                  <div className="pa__ai-section pa__fade">
                    <SentChip
                      icon="task_alt"
                      label="3 reminders sent"
                      detail="Friendly nudge · CC'd to your inbox"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pa__composer">
            <input
              className="pa__composer-input"
              placeholder="Ask anything..."
              readOnly
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="pa__composer-actions">
              <span className="material-symbols-outlined pa__composer-icon">attach_file</span>
              <span className="pa__composer-send">
                <span className="material-symbols-outlined">arrow_upward</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────── Visuals ───────── */

function InvoiceDraft() {
  const subtotal = INVOICE_LINES.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="sdp__invoice">
      <div className="sdp__invoice-head">
        <div className="sdp__invoice-headline">
          <span className="sdp__invoice-tag">Draft invoice</span>
          <span className="sdp__invoice-num">INV-2154</span>
        </div>
        <div className="sdp__invoice-meta">
          <div>
            <div className="sdp__invoice-meta-label">Bill to</div>
            <div className="sdp__invoice-meta-value">Adam Smith</div>
          </div>
          <div>
            <div className="sdp__invoice-meta-label">Invoice date</div>
            <div className="sdp__invoice-meta-value">May 15, 2026</div>
          </div>
          <div>
            <div className="sdp__invoice-meta-label">Due · Net 30</div>
            <div className="sdp__invoice-meta-value">Jun 14, 2026</div>
          </div>
        </div>
      </div>

      <div className="sdp__invoice-table">
        <div className="sdp__inv-row sdp__inv-row--head">
          <span>Description</span>
          <span className="sdp__inv-num">Qty</span>
          <span className="sdp__inv-num">Rate</span>
          <span className="sdp__inv-num">Amount</span>
        </div>
        {INVOICE_LINES.map((l) => (
          <div key={l.desc} className="sdp__inv-row">
            <span>{l.desc}</span>
            <span className="sdp__inv-num">{l.qty}</span>
            <span className="sdp__inv-num">{fmtUSD(l.rate)}</span>
            <span className="sdp__inv-num">{fmtUSD(l.amount)}</span>
          </div>
        ))}
        <div className="sdp__inv-row sdp__inv-row--total">
          <span>Total · landscaping services</span>
          <span />
          <span />
          <span className="sdp__inv-num sdp__inv-grand">{fmtUSD(subtotal)}</span>
        </div>
      </div>

      <div className="sdp__invoice-actions">
        <span className="sdp__invoice-cta">Send invoice</span>
        <span className="sdp__invoice-secondary">Edit draft</span>
      </div>
    </div>
  );
}

function PastDueList() {
  const total = PAST_DUE.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="sdp__pastdue">
      <div className="sdp__pastdue-head">
        <span className="sdp__pastdue-label">Past-due receivables</span>
        <span className="sdp__pastdue-count">{PAST_DUE.length} open · {fmtUSD(total)}</span>
      </div>
      <div className="sdp__pd-row sdp__pd-row--head">
        <span>Customer</span>
        <span>Invoice</span>
        <span className="sdp__inv-num">Amount</span>
        <span>Due</span>
        <span className="sdp__inv-num">Age</span>
      </div>
      {PAST_DUE.map((r) => (
        <div key={r.invoice} className="sdp__pd-row">
          <span className="sdp__pd-customer">{r.customer}</span>
          <span className="sdp__pd-invoice">{r.invoice}</span>
          <span className="sdp__inv-num">{fmtUSD(r.amount)}</span>
          <span className="sdp__pd-due">{r.due}</span>
          <span className="sdp__inv-num sdp__pd-age">{r.age}d overdue</span>
        </div>
      ))}
    </div>
  );
}

function SentChip({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div className="sdp__sent">
      <span className="material-symbols-outlined sdp__sent-icon">{icon}</span>
      <div className="sdp__sent-text">
        <div className="sdp__sent-label">{label}</div>
        <div className="sdp__sent-detail">{detail}</div>
      </div>
      <span className="sdp__sent-check">✓</span>
    </div>
  );
}
