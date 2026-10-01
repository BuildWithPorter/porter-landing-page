import { useEffect } from "react";

/** Re-align a deep link after hydration and web fonts establish the layout. */
export function useInitialHashLanding() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    let cancelled = false;
    let frame = 0;
    const cancel = () => { cancelled = true; };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, cancel, { passive: true });
    const align = () => {
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            // A visitor who has started navigating must never be pulled back.
            if (cancelled || window.location.hash !== hash) return;
            let id: string;
            try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
            document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
          });
        });
      });
    };
    if (document.readyState === "complete") align();
    else window.addEventListener("load", align, { once: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("load", align);
      for (const event of events) window.removeEventListener(event, cancel);
    };
  }, []);
}
