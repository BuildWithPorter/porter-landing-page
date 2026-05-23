import { useEffect, useState } from "react";
import "./illustrations.css";

// "My bookkeeper doesn't know my business." — one message card that
// rotates through Email / Slack / SMS when active; sits on Email
// statically when inactive.
export function PainBookkeeper({ active = true }: { active?: boolean }) {
  const [tabIndex, setTabIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setTabIndex((a) => (a + 1) % 3), 2000);
    return () => window.clearInterval(id);
  }, [active]);

  const threads = [
    {
      channel: "Email",
      avatar: "JM",
      name: "Jenna, your bookkeeper",
      preview: "Re: Stripe deposit on the 14th, can you confirm which invoice this maps to? Looping in Aaron.",
      ts: "8 days ago",
    },
    {
      channel: "Slack",
      avatar: "AS",
      name: "Aaron (firm)",
      preview: "Hey, for the Stripe deposit, is that Customer A or B? Jenna asked me but I wasn't sure.",
      ts: "5 days ago",
    },
    {
      channel: "SMS",
      avatar: "JM",
      name: "Jenna",
      preview: "Quick one when you can: that Stripe payment from the 14th? Still need to categorize.",
      ts: "today",
    },
  ];

  const i = active ? tabIndex : 0;

  return (
    <div className="illu illu--bookkeeper" aria-hidden="true">
      <div className="illu__tabs">
        {threads.map((t, idx) => (
          <span
            key={t.channel}
            className={`illu__tab illu__tab--${t.channel.toLowerCase()} ${idx === i ? "is-active" : ""}`}
          >
            {t.channel}
          </span>
        ))}
      </div>

      <div className="illu__thread is-active" key={i}>
        <div className="illu__thread-head">
          <span className="illu__ts">{threads[i].ts}</span>
        </div>
        <div className="illu__thread-body">
          <span className="illu__avatar">{threads[i].avatar}</span>
          <div className="illu__thread-text">
            <div className="illu__name-line">{threads[i].name}</div>
            <div className="illu__preview">{threads[i].preview}</div>
          </div>
        </div>
      </div>

      <div className="illu__bk-meta">
        <span className="illu__bk-meta-dot" />
        Same question, three channels, eight days
      </div>
    </div>
  );
}
