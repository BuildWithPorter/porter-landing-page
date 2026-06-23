import { useEffect } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import posthog from "posthog-js";

// Per-tool keys come from Vercel env vars. Set them in:
//   Vercel project → Settings → Environment Variables
//   - VITE_POSTHOG_KEY      (the project API key from PostHog)
//   - VITE_POSTHOG_HOST     (defaults to https://us.i.posthog.com)
//   - VITE_CLARITY_ID       (the project ID from clarity.microsoft.com)
//
// Each tool is conditional on its key being present so dev / preview
// environments without analytics keys don't break.
const POSTHOG_KEY   = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
const POSTHOG_HOST  = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
const CLARITY_ID    = import.meta.env.VITE_CLARITY_ID   as string | undefined;

let posthogInited = false;

function initPostHog() {
  if (posthogInited || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Marketing-site defaults: capture pageviews automatically, respect DNT,
    // skip session recording on the marketing site (it's on the app side).
    capture_pageview: true,
    respect_dnt: true,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug(false);
    },
  });
  posthogInited = true;
}

function injectClarity(id: string) {
  if (typeof window === "undefined") return;
  if (document.getElementById("ms-clarity")) return;
  const s = document.createElement("script");
  s.id = "ms-clarity";
  s.async = true;
  s.innerHTML = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id}");
  `;
  document.head.appendChild(s);
}

/**
 * Single mount point for every analytics tool the marketing site uses.
 * Mount once at the App root. Tools self-no-op if their env var is missing,
 * so dev environments without keys stay silent and don't break.
 */
export function Analytics() {
  useEffect(() => {
    initPostHog();
    if (CLARITY_ID) injectClarity(CLARITY_ID);
  }, []);

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
}
