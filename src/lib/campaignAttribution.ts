import { attributionCookieDomain } from "./marketingTracking";

export type CampaignConversionContext = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  meta_fbp: string;
  meta_fbc: string;
};

const CONTEXT_COOKIE = "porter_campaign_conversion_context";
// Reason: Conversion context needs the same cross-page retention window as the
// existing first-touch cookie so a visitor can reach the form after navigation.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
// Reason: These are the campaign parameters accepted by both checklist APIs;
// an incoming campaign replaces the prior tuple instead of mixing campaigns.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
// Reason: A bounded per-field UTM budget leaves room for both Meta IDs and
// cookie attributes under the browser's per-cookie size limit.
const MAX_UTM_ENCODED_BYTES = 128;
// Reason: The API caps Meta IDs at 300 characters; oversized identifiers must
// be omitted whole so CAPI never receives a different ID created by truncation.
const MAX_META_ID_LENGTH = 300;
// Reason: This encoded budget still permits 300-byte IDs while rejecting
// pathological Unicode values that could crowd out the campaign cookie.
const MAX_META_ID_ENCODED_BYTES = 600;
// Reason: Include the cookie name and attributes in the cap, leaving headroom
// below the 4 KiB minimum user-agent cookie size.
const MAX_COOKIE_ASSIGNMENT_BYTES = 3500;

function cookieValues(name: string): string[] {
  if (typeof document === "undefined") return [];
  return document.cookie.split(";").flatMap((rawCookie) => {
    const separator = rawCookie.indexOf("=");
    if (separator < 0 || rawCookie.slice(0, separator).trim() !== name) return [];
    const value = rawCookie.slice(separator + 1).trim();
    try {
      return [decodeURIComponent(value)];
    } catch {
      // Reason: A malformed Meta cookie must not erase valid campaign data
      // from another cookie with the same name and a different host scope.
      return [value];
    }
  });
}

function wellFormed(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index++;
      } else {
        result += "\ufffd";
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      result += "\ufffd";
    } else {
      result += value[index];
    }
  }
  return result;
}

function cleanUtm(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = wellFormed(value).replace(/[\u0000-\u001f\u007f]/g, "").trim();
  let result = "";
  let encodedBytes = 0;
  // Reason: Count encoded bytes by code point so a size limit can never split
  // a surrogate pair and make encodeURIComponent throw during app startup.
  for (const codePoint of normalized) {
    const pointBytes = encodeURIComponent(codePoint).length;
    if (encodedBytes + pointBytes > MAX_UTM_ENCODED_BYTES) break;
    result += codePoint;
    encodedBytes += pointBytes;
  }
  return result;
}

function safeMetaId(value: unknown): string {
  // Reason: Matching identifiers are opaque tokens; normalize neither their
  // length nor contents, and omit values that cannot be sent as-is.
  if (typeof value !== "string" || !value || value !== wellFormed(value)) return "";
  if (value.length > MAX_META_ID_LENGTH || /[\s\u0000-\u001f\u007f]/.test(value)) return "";
  try {
    return encodeURIComponent(value).length <= MAX_META_ID_ENCODED_BYTES ? value : "";
  } catch {
    // Reason: Invalid Unicode identifiers must be omitted, never rewritten
    // into a different click or browser ID.
    return "";
  }
}

function fbcClickId(value: string): string | null {
  // Reason: Meta cookies can use any numeric subdomain index; validate the
  // index, timestamp and nonempty click ID without assuming the index is 1.
  const match = /^fb\.\d+\.\d+\.(.+)$/.exec(safeMetaId(value));
  if (!match) return null;
  const timestamp = Number(value.split(".")[2]);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? match[1] : null;
}

function validFbc(value: string): boolean {
  return fbcClickId(value) !== null;
}

function firstValidFbc(): string {
  return cookieValues("_fbc").find(validFbc) || "";
}

function validFbp(value: string): boolean {
  const safeValue = safeMetaId(value);
  const match = /^fb\.\d+\.(\d+)\..+$/.exec(safeValue);
  if (!match) return false;
  const timestamp = Number(match[1]);
  return Number.isSafeInteger(timestamp) && timestamp > 0;
}

function firstValidFbp(): string {
  return cookieValues("_fbp").find(validFbp) || "";
}

function existingFbcForClick(fbclid: string): string {
  // Reason: Host-only and parent-domain _fbc cookies can coexist. Select the
  // value for this exact click instead of whichever duplicate appears first.
  return cookieValues("_fbc").find((value) => fbcClickId(value) === fbclid) || "";
}

function sameUtmTuple(left: CampaignConversionContext, right: CampaignConversionContext): boolean {
  return UTM_KEYS.every((key) => left[key] === right[key]);
}

function readContextCookie(): CampaignConversionContext | null {
  const serialized = cookieValues(CONTEXT_COOKIE)[0];
  if (!serialized) return null;
  try {
    const value = JSON.parse(serialized) as Partial<Record<keyof CampaignConversionContext, unknown>>;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return {
      utm_source: cleanUtm(value.utm_source),
      utm_medium: cleanUtm(value.utm_medium),
      utm_campaign: cleanUtm(value.utm_campaign),
      utm_content: cleanUtm(value.utm_content),
      utm_term: cleanUtm(value.utm_term),
      meta_fbp: validFbp(safeMetaId(value.meta_fbp)) ? safeMetaId(value.meta_fbp) : "",
      meta_fbc: validFbc(safeMetaId(value.meta_fbc)) ? safeMetaId(value.meta_fbc) : "",
    };
  } catch {
    return null;
  }
}

function writeContextCookie(context: CampaignConversionContext): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const domain = attributionCookieDomain(window.location.hostname);
  const cookie = `${CONTEXT_COOKIE}=${encodeURIComponent(JSON.stringify(context))}; Max-Age=${COOKIE_MAX_AGE}; Path=/${
    domain ? `; Domain=${domain}` : ""
  }; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  // Reason: User agents may silently discard cookies above their per-cookie
  // limit; keep the complete assignment below a conservative 3,500-byte cap.
  if (cookie.length > MAX_COOKIE_ASSIGNMENT_BYTES) return;
  document.cookie = cookie;
}

function currentCampaignFromUrl(): CampaignConversionContext | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const hasFbclid = params.has("fbclid");
  const fbclid = safeMetaId(params.get("fbclid"));
  const hasCampaignParams = hasFbclid || UTM_KEYS.some((key) => cleanUtm(params.get(key)));
  if (!hasCampaignParams) return null;

  const tuple = {
    utm_source: cleanUtm(params.get("utm_source")),
    utm_medium: cleanUtm(params.get("utm_medium")),
    utm_campaign: cleanUtm(params.get("utm_campaign")),
    utm_content: cleanUtm(params.get("utm_content")),
    utm_term: cleanUtm(params.get("utm_term")),
  };
  const stored = readContextCookie();
  const storedMatchesCurrentTuple = stored !== null && sameUtmTuple(stored, { ...tuple, meta_fbp: "", meta_fbc: "" });
  const currentFbc = hasFbclid
    ? fbclid
      ? existingFbcForClick(fbclid) ||
        (stored && fbcClickId(stored.meta_fbc) === fbclid ? stored.meta_fbc : "") ||
        safeMetaId(`fb.1.${Date.now()}.${fbclid}`)
      : ""
    : storedMatchesCurrentTuple && stored && validFbc(stored.meta_fbc) ? stored.meta_fbc : "";
  return {
    ...tuple,
    // Reason: Browser ID supports event matching; click ID is reset when a new
    // campaign URL arrives so an older Meta click cannot be credited to it.
    meta_fbp: firstValidFbp(),
    meta_fbc: currentFbc,
  };
}

export function captureCampaignConversionContext(): CampaignConversionContext {
  const current = currentCampaignFromUrl();
  if (current) {
    writeContextCookie(current);
    return current;
  }
  return getCampaignConversionContext();
}

export function getCampaignConversionContext(): CampaignConversionContext {
  const stored = readContextCookie();
  if (stored) {
    // Reason: _fbp may be created after entry capture by the Meta pixel, while
    // the click ID and campaign tuple must remain tied to the captured visit.
    return { ...stored, meta_fbp: firstValidFbp() || stored.meta_fbp };
  }
  return {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    meta_fbp: firstValidFbp(),
    // Reason: Direct return visits may have a valid Meta click cookie from the
    // prior pixel initialization even when no campaign context cookie exists.
    meta_fbc: firstValidFbc(),
  };
}

export function campaignAnalyticsProperties(context: CampaignConversionContext): Record<string, string | boolean> {
  // Reason: Analytics needs campaign labels and match-presence diagnostics;
  // raw browser and click IDs remain confined to conversion requests.
  return {
    utm_source: context.utm_source,
    utm_medium: context.utm_medium,
    utm_campaign: context.utm_campaign,
    utm_content: context.utm_content,
    utm_term: context.utm_term,
    has_meta_click_id: Boolean(context.meta_fbc),
    has_meta_browser_id: Boolean(context.meta_fbp),
  };
}

