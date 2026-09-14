const META_PIXEL_ID = "1383684593949468";
const META_PIXEL_SOURCE = "https://connect.facebook.net/en_US/fbevents.js";

type MetaPixelQueue = NonNullable<Window["fbq"]> & {
  callMethod?: (...args: unknown[]) => void;
  loaded: boolean;
  push: MetaPixelQueue;
  queue: unknown[][];
  version: string;
};

export function isPrimaryMarketingHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "buildwithporter.com" || normalized === "www.buildwithporter.com";
}

export function initializeMetaPixel(hostname?: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // Reason: Vercel preview and development hosts render the same static index.
  // Initializing the production dataset there makes internal QA look like paid
  // funnel traffic and caused Events Manager to attribute the pixel to nine sites.
  if (!isPrimaryMarketingHost(hostname ?? window.location.hostname)) return false;
  if (window.fbq) return true;

  const pixel = function (...args: unknown[]) {
    if (pixel.callMethod) pixel.callMethod(...args);
    else pixel.queue.push(args);
  } as MetaPixelQueue;
  pixel.push = pixel;
  pixel.loaded = true;
  pixel.version = "2.0";
  pixel.queue = [];
  window.fbq = pixel;

  const script = document.createElement("script");
  script.async = true;
  script.src = META_PIXEL_SOURCE;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript);
  else document.head.appendChild(script);

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
  return true;
}
