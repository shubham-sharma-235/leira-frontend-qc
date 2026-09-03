/**
 * Meta Pixel — base code loads directly on the site (PublicOnlyAnalytics).
 *
 * Pixel ID: 2246501689158730
 * GTM (GTM-WPP4J9CK) may still be present for GA / other tags.
 *
 * Site also pushes:
 *  1) dataLayer events `meta_ViewContent` | `meta_AddToCart` | `meta_InitiateCheckout` | `meta_Purchase`
 *  2) fbq('track', ...) for standard events once Pixel is ready
 *
 * Avoid a second Meta Pixel PageView tag in GTM on All Pages, or you will double-count.
 */

export const META_PIXEL_ID = "2246501689158730";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type MetaEventParams = Record<string, unknown>;

const FBQ_BRIDGE_ENABLED =
  String(process.env.NEXT_PUBLIC_META_FBQ_BRIDGE ?? "true").toLowerCase() !== "false";

/** Wait until GTM Meta Pixel tag has defined window.fbq */
export function whenFbqReady(run: () => void, timeoutMs = 8000): void {
  if (typeof window === "undefined") return;
  const start = Date.now();
  const poll = () => {
    if (typeof window.fbq === "function") {
      run();
      return;
    }
    if (Date.now() - start >= timeoutMs) {
      run();
      return;
    }
    window.setTimeout(poll, 50);
  };
  poll();
}

function pushMetaDataLayer(eventName: string, params?: MetaEventParams) {
  window.dataLayer = window.dataLayer || [];
  const safeParams = params && typeof params === "object" ? { ...params } : {};
  window.dataLayer.push({
    event: `meta_${eventName}`,
    meta_event_name: eventName,
    meta_event_params: safeParams,
    meta_pixel_id: META_PIXEL_ID,
    ...safeParams,
  });
}

function fireFbq(eventName: string, params?: MetaEventParams) {
  if (typeof window.fbq !== "function") return;
  try {
    if (params && Object.keys(params).length > 0) {
      window.fbq("track", eventName, params);
      return;
    }
    window.fbq("track", eventName);
  } catch {
    // Never block UX
  }
}

/**
 * Meta standard events → dataLayer (GTM) + optional fbq bridge (after GTM loads Pixel).
 */
export function trackMetaEvent(eventName: string, params?: MetaEventParams) {
  if (typeof window === "undefined") return;
  const name = String(eventName || "").trim();
  if (!name) return;

  try {
    pushMetaDataLayer(name, params);
  } catch {
    /* ignore */
  }

  if (!FBQ_BRIDGE_ENABLED) return;

  whenFbqReady(() => {
    fireFbq(name, params);
  });
}

/** SPA / soft navigations — pair with GTM History Change or Custom Event `virtual_page_view`. */
export function trackMetaVirtualPageView(
  pathname: string,
  options?: { fireFbqPageView?: boolean }
) {
  if (typeof window === "undefined") return;
  const path = String(pathname || "").trim() || "/";
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "virtual_page_view",
      page_path: path,
      page_location: window.location.href,
      page_title: typeof document !== "undefined" ? document.title : "",
      meta_pixel_id: META_PIXEL_ID,
    });
  } catch {
    /* ignore */
  }

  if (!FBQ_BRIDGE_ENABLED || options?.fireFbqPageView === false) return;
  whenFbqReady(() => {
    fireFbq("PageView");
  });
}

export function parseInrPrice(value: string | number | undefined | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value).replace(/,/g, "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
