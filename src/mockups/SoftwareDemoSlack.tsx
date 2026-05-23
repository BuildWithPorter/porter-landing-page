import { useEffect, useState } from "react";
import "./SoftwareDemoSlack.css";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const Q1 = "Did we receive a wire from Clearwater LLC this month for $2,350?";
const A1 = "Yes, I see it — a wire from Clearwater LLC for $2,350 landed on May 12, 2026, routed to your Operating account. It's already booked against INV-2147.";
const Q2 = "What's my cash balance as of the end of April 2026?";
const A2 = "Your total cash position at the close of April was $284,160 across three accounts:";

const CASH = [
  { account: "Operating · Chase",    last4: "···3041", amount: 218430 },
  { account: "Reserve · Mercury",    last4: "···7782", amount: 49120 },
  { account: "Tax holdback · Brex",  last4: "···0294", amount: 16610 },
];

const CHANNELS = [
  { name: "general",  unread: false },
  { name: "finance",  active: true },
  { name: "wins",     unread: false },
  { name: "ops",      unread: false },
];

const DMS = [
  { name: "Porter",   subtitle: "AI · finance copilot", icon: "porter", active: true },
  { name: "Ben",      subtitle: "online", icon: "B" },
  { name: "Rica",     subtitle: "5h ago", icon: "R" },
];

export function SoftwareDemoSlack() {
  /* Step progression:
     0 nothing
     1 Q1 fades in
     2 Porter typing indicator
     3 Porter response 1 (text)
     4 Porter transaction card
     5 Q2 fades in
     6 Porter typing indicator
     7 Porter response 2 (text)
     8 Cash breakdown card */
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
      [2400, 3],
      [3400, 4],
      [4600, 5],
      [5600, 6],
      [6300, 7],
      [7100, 8],
    ];
    const timers = schedule.map(([t, s]) => window.setTimeout(() => setStep(s), t));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [reduced]);

  const totalCash = CASH.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="sds">
      {/* Slack-style workspace sidebar (very narrow) */}
      <aside className="sds__workspaces">
        <div className="sds__workspace sds__workspace--active" title="Acme">
          <span className="sds__workspace-mark">AC</span>
        </div>
        <div className="sds__workspace" title="Add workspace">
          <span className="material-symbols-outlined">add</span>
        </div>
      </aside>

      {/* Channels sidebar */}
      <aside className="sds__sidebar">
        <div className="sds__sidebar-head">
          <div className="sds__sidebar-title">Acme Landscaping</div>
          <span className="material-symbols-outlined sds__sidebar-edit">edit_square</span>
        </div>

        <div className="sds__sidebar-section">
          <div className="sds__sidebar-section-label">
            <span className="material-symbols-outlined sds__chev">expand_more</span>
            Channels
          </div>
          {CHANNELS.map((c) => (
            <div
              key={c.name}
              className={`sds__sidebar-row ${c.active ? "is-active" : ""}`}
            >
              <span className="sds__hash">#</span>
              <span className="sds__row-name">{c.name}</span>
            </div>
          ))}
        </div>

        <div className="sds__sidebar-section">
          <div className="sds__sidebar-section-label">
            <span className="material-symbols-outlined sds__chev">expand_more</span>
            Direct messages
          </div>
          {DMS.map((d) => (
            <div key={d.name} className={`sds__sidebar-row ${d.active ? "is-dm-active" : ""}`}>
              {d.icon === "porter" ? (
                <span className="sds__dm-porter">
                  <img src="/porter-icon.svg" alt="" />
                </span>
              ) : (
                <span className="sds__dm-avatar">{d.icon}</span>
              )}
              <span className="sds__row-name">{d.name}</span>
              {d.icon === "porter" && <span className="sds__app-tag">APP</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* Main channel area */}
      <section className="sds__main">
        <header className="sds__channel-head">
          <div className="sds__channel-title">
            <span className="sds__porter-pill">
              <img src="/porter-icon.svg" alt="" />
            </span>
            <span className="sds__channel-name">Porter</span>
            <span className="sds__app-tag sds__app-tag--head">APP</span>
          </div>
          <div className="sds__channel-actions">
            <span className="material-symbols-outlined">videocam</span>
            <span className="material-symbols-outlined">headphones</span>
            <span className="material-symbols-outlined">search</span>
            <span className="material-symbols-outlined">more_horiz</span>
          </div>
        </header>

        <div className="sds__messages">
          {/* First exchange */}
          {step >= 1 && (
            <Message
              author="Michael Fajardo"
              avatar="M"
              time="10:24 AM"
              isUser
            >
              {Q1}
            </Message>
          )}

          {step === 2 && <Typing />}

          {step >= 3 && (
            <Message
              author="Porter"
              isApp
              time="10:24 AM"
            >
              {A1}
              {step >= 4 && (
                <div className="sds__attach">
                  <div className="sds__attach-border" />
                  <div className="sds__attach-body">
                    <div className="sds__attach-head">
                      <span className="sds__attach-label">Transaction · matched</span>
                      <span className="sds__attach-pill sds__attach-pill--ok">Booked</span>
                    </div>
                    <div className="sds__attach-rows">
                      <div className="sds__attach-row">
                        <span className="sds__attach-key">Customer</span>
                        <span className="sds__attach-val">Clearwater LLC</span>
                      </div>
                      <div className="sds__attach-row">
                        <span className="sds__attach-key">Amount</span>
                        <span className="sds__attach-val sds__num">{fmtUSD(2350)}</span>
                      </div>
                      <div className="sds__attach-row">
                        <span className="sds__attach-key">Date · type</span>
                        <span className="sds__attach-val">May 12, 2026 · Wire transfer</span>
                      </div>
                      <div className="sds__attach-row">
                        <span className="sds__attach-key">Account</span>
                        <span className="sds__attach-val">Operating · Chase ···3041</span>
                      </div>
                      <div className="sds__attach-row">
                        <span className="sds__attach-key">Applied to</span>
                        <span className="sds__attach-val">INV-2147 · Carlos Mendez project</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Message>
          )}

          {/* Second exchange */}
          {step >= 5 && (
            <Message
              author="Michael Fajardo"
              avatar="M"
              time="10:25 AM"
              isUser
            >
              {Q2}
            </Message>
          )}

          {step === 6 && <Typing />}

          {step >= 7 && (
            <Message
              author="Porter"
              isApp
              time="10:25 AM"
            >
              {A2}
              {step >= 8 && (
                <div className="sds__attach">
                  <div className="sds__attach-border" />
                  <div className="sds__attach-body">
                    <div className="sds__attach-head">
                      <span className="sds__attach-label">Cash position · Apr 30, 2026</span>
                      <span className="sds__attach-pill">{fmtUSD(totalCash)}</span>
                    </div>
                    <div className="sds__cash-rows">
                      {CASH.map((c) => (
                        <div key={c.account} className="sds__cash-row">
                          <span className="sds__cash-name">{c.account}</span>
                          <span className="sds__cash-acct">{c.last4}</span>
                          <span className="sds__cash-amt sds__num">{fmtUSD(c.amount)}</span>
                        </div>
                      ))}
                      <div className="sds__cash-row sds__cash-row--total">
                        <span className="sds__cash-name">Total cash on hand</span>
                        <span />
                        <span className="sds__cash-amt sds__cash-grand sds__num">{fmtUSD(totalCash)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Message>
          )}
        </div>

        <div className="sds__compose">
          <div className="sds__compose-input">
            <span className="sds__compose-placeholder">Message Porter</span>
          </div>
          <div className="sds__compose-actions">
            <span className="material-symbols-outlined">attach_file</span>
            <span className="material-symbols-outlined">format_bold</span>
            <span className="material-symbols-outlined">sentiment_satisfied</span>
            <span className="sds__compose-send">
              <span className="material-symbols-outlined">send</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Message({
  author,
  avatar,
  time,
  children,
  isApp,
  isUser,
}: {
  author: string;
  avatar?: string;
  time: string;
  children: React.ReactNode;
  isApp?: boolean;
  isUser?: boolean;
}) {
  return (
    <div className="sds__message sds__fade">
      {isApp ? (
        <span className="sds__msg-avatar sds__msg-avatar--porter">
          <img src="/porter-icon.svg" alt="" />
        </span>
      ) : (
        <span className="sds__msg-avatar">{avatar}</span>
      )}
      <div className="sds__msg-body">
        <div className="sds__msg-head">
          <span className="sds__msg-name">{author}</span>
          {isApp && <span className="sds__app-tag">APP</span>}
          <span className="sds__msg-time">{time}</span>
        </div>
        <div className={`sds__msg-text ${isUser ? "is-user" : ""}`}>{children}</div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="sds__typing sds__fade">
      <span className="sds__msg-avatar sds__msg-avatar--porter">
        <img src="/porter-icon.svg" alt="" />
      </span>
      <div className="sds__typing-bubble">
        <span className="sds__typing-dot" />
        <span className="sds__typing-dot" />
        <span className="sds__typing-dot" />
      </div>
    </div>
  );
}
