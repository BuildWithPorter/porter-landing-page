import { industryForHost } from "../industries";

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
  // Reason (POR-3087): industry subdomains (design.buildwithporter.com, ...) are
  // production ad landing pages, so the pixel must fire there or those campaigns
  // lose PageView and every conversion. They come from the industry registry by
  // exact name. Do not widen this to "*.buildwithporter.com": dev-landing and
  // Vercel previews share the parent domain and must stay out of the dataset.
  return (
    normalized === "buildwithporter.com" ||
    normalized === "www.buildwithporter.com" ||
    industryForHost(normalized) !== null
  );
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
