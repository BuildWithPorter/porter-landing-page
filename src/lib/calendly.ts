const CALENDLY_SCRIPT_URL = "https://assets.calendly.com/assets/external/widget.js";
const CALENDLY_STYLESHEET_URL = "https://assets.calendly.com/assets/external/widget.css";
const CALENDLY_STYLESHEET_ID = "calendly-widget-styles";

let calendlyLoadPromise: Promise<void> | null = null;

function ensureCalendlyStylesheet() {
  if (document.getElementById(CALENDLY_STYLESHEET_ID)) return;

  const stylesheet = document.createElement("link");
  stylesheet.id = CALENDLY_STYLESHEET_ID;
  stylesheet.rel = "stylesheet";
  stylesheet.href = CALENDLY_STYLESHEET_URL;
  document.head.appendChild(stylesheet);
}

function loadCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (calendlyLoadPromise) return calendlyLoadPromise;

  ensureCalendlyStylesheet();
  calendlyLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_URL}"]`,
    );

    const onLoad = () => {
      if (window.Calendly) resolve();
      else reject(new Error("Calendly loaded without exposing its widget API"));
    };
    const onError = () => reject(new Error("Calendly widget failed to load"));

    if (existingScript) {
      existingScript.addEventListener("load", onLoad, { once: true });
      existingScript.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = CALENDLY_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    document.head.appendChild(script);
  });

  return calendlyLoadPromise;
}

export async function openCalendlyPopup(url: string) {
  try {
    await loadCalendly();
    window.Calendly?.initPopupWidget({ url });
  } catch {
    window.location.assign(url);
  }
}
