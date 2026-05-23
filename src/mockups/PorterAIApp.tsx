import { useEffect, useState } from "react";
import { SERVICES, type ServiceKey } from "./PorterAIServices";
import "./PorterAIApp.css";

const SIDEBAR_ITEMS = [
  { icon: "auto_awesome", label: "Porter AI", active: true },
  { icon: "grid_view", label: "Dashboard" },
  { icon: "table_chart", label: "Transactions" },
  { icon: "calendar_today", label: "Schedules" },
  { icon: "task_alt", label: "Monthly Close" },
  { icon: "description", label: "Documents" },
  { icon: "bar_chart", label: "Reports" },
];

const SIDEBAR_SETTINGS = [
  { icon: "search", label: "Activity" },
  { icon: "memory", label: "Memories" },
  { icon: "settings", label: "Settings" },
];

export function PorterAIApp() {
  const [active, setActive] = useState<ServiceKey | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  const service = active ? SERVICES.find((s) => s.key === active) : null;

  return (
    <div className="pa">
      <aside className="pa__sidebar" aria-label="Porter app navigation">
        <div className="pa__sidebar-brand" title="Porter">
          <img src="/porter-icon.svg" alt="" />
        </div>

        <nav className="pa__sidebar-nav">
          {SIDEBAR_ITEMS.map((it) => (
            <div
              key={it.label}
              className={`pa__sidebar-row ${it.active ? "is-active" : ""}`}
              title={it.label}
            >
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>

        <div className="pa__sidebar-divider" />

        <nav className="pa__sidebar-nav">
          {SIDEBAR_SETTINGS.map((it) => (
            <div key={it.label} className="pa__sidebar-row" title={it.label}>
              <span className="material-symbols-outlined pa__sidebar-icon">{it.icon}</span>
            </div>
          ))}
        </nav>

        <div className="pa__sidebar-user" title="Account">
          <span className="pa__sidebar-avatar">M</span>
        </div>
      </aside>

      <section className="pa__main">
        <header className="pa__topbar">
          <div className="pa__topbar-left">
            <span className="material-symbols-outlined pa__topbar-icon">menu</span>
            <div className="pa__workspace">
              <span className="pa__workspace-mark">AC</span>
              <span className="pa__workspace-name">Acme Inc.</span>
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
          {active === null ? (
            <SuggestionGrid onPick={setActive} />
          ) : service ? (
            <Conversation
              key={service.key}
              service={service}
              reduced={reduced}
              onBack={() => setActive(null)}
            />
          ) : null}

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

function SuggestionGrid({ onPick }: { onPick: (k: ServiceKey) => void }) {
  return (
    <div className="pa__suggestions">
      <div className="pa__suggestions-left">
        <div className="pa__greeting-block">
          <h2 className="pa__greeting">What can I help with today?</h2>
          <p className="pa__greeting-hint">Click one of the services on the right to learn more.</p>
        </div>
      </div>
      <div className="pa__suggestions-right">
        <div className="pa__grid">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="pa__card"
              onClick={() => onPick(s.key)}
              aria-label={`Ask about ${s.title}`}
            >
              <span className="material-symbols-outlined pa__card-icon">{s.icon}</span>
              <div className="pa__card-text">
                <div className="pa__card-title">{s.title}</div>
                <div className="pa__card-q">&ldquo;{s.exampleQuestion}&rdquo;</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Conversation({
  service,
  reduced,
  onBack,
}: {
  service: (typeof SERVICES)[number];
  reduced: boolean;
  onBack: () => void;
}) {
  // Step progression — slower, more cinematic, each bullet appears on its own.
  // 0=nothing, 1=user, 2=intro, then 3,4,5,6 reveal bullets one-by-one.
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(2 + service.bullets.length);
      return;
    }
    setStep(0);
    const schedule: Array<[number, number]> = [
      [400, 1],   // user message types in
      [1400, 2],  // AI intro begins
    ];
    // bullets, one every 600ms after intro
    for (let i = 0; i < service.bullets.length; i++) {
      schedule.push([2200 + i * 600, 3 + i]);
    }
    const timers = schedule.map(([t, s]) => window.setTimeout(() => setStep(s), t));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [service.key, service.bullets.length, reduced]);

  return (
    <div className="pa__chat">
      <button type="button" className="pa__back" onClick={onBack}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back to suggestions
      </button>

      {step >= 1 && (
        <div className="pa__user">
          <div className="pa__user-bubble">{service.userMessage}</div>
        </div>
      )}

      {step >= 2 && (
        <div className="pa__ai">
          <div className="pa__ai-head pa__fade">
            <span className="pa__ai-mark">
              <img src="/porter-icon.svg" alt="" />
            </span>
            <span className="pa__ai-name">Porter</span>
            <span className="pa__ai-tag">finance copilot</span>
          </div>

          <div className="pa__ai-section pa__fade">
            <p className="pa__ai-intro">{service.intro}</p>
          </div>

          <div className="pa__ai-bullets">
            {service.bullets.map((b, i) => (
              step >= 3 + i ? (
                <div key={b.title} className="pa__ai-bullet pa__fade">
                  <span className="material-symbols-outlined pa__ai-bullet-icon">{b.icon}</span>
                  <div>
                    <div className="pa__ai-bullet-title">{b.title}</div>
                    <div className="pa__ai-bullet-body">{b.body}</div>
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
