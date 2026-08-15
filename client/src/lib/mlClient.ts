/**
 * ML client — direct browser calls to the ML backend.
 *
 * Architecture (Option C, user-chosen): the browser calls the Render-hosted
 * Flask backend directly. Server-to-server calls from the deployed sandbox to
 * Render are blocked by Render's Cloudflare bot challenge, so the Express
 * /api/ml proxy is only used as a dev-mode fallback (when VITE_ML_BACKEND_URL
 * is unset, requests go to /api/ml which the sandbox proxy forwards to the
 * local Flask instance).
 */

/** Deployed ML backend on Render (primary production endpoint). */
const RENDER_BACKEND_URL = "https://retinavision-ml-backend.onrender.com";

/** Fallback sandbox ML backend (public URL of the Flask backend in the Manus sandbox).
 *  Used automatically when the Render endpoint does not respond (Render free-tier
 *  services can get stuck in the wake-up interstitial or be placed behind the
 *  Cloudflare challenge). */
const FALLBACK_BACKEND_URL = "https://8000-i5ydqj0z7cacur3n4uku0-89aa4dc5.sg1.manus.computer";

export type MlMode = "direct" | "proxy";

/**
 * Resolve the ML backend base URL.
 * - VITE_ML_BACKEND_URL set explicitly -> use it (custom deployment override)
 * - otherwise -> production Render URL (direct browser calls)
 * The result `base` has no trailing slash; `mode` tells callers how to reach it.
 */
export function resolveMlBackend(): { base: string; mode: MlMode } {
  const envUrl = import.meta.env.VITE_ML_BACKEND_URL as string | undefined;
  if (envUrl) {
    return { base: envUrl.replace(/\/+$/, ""), mode: "direct" };
  }
  // Dev sandbox: local Flask reachable via the Express proxy only.
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return { base: "/api/ml", mode: "proxy" };
  }
  return { base: RENDER_BACKEND_URL, mode: "direct" };
}

/** Cached fallback state so callers can prefer the working endpoint without re-probing. */
let renderUnreachableSince: number | null = null;
const FALLBACK_TIMEOUT_MS = 30_000;

/**
 * If the Render endpoint has been unreachable for a while, use the sandbox
 * fallback automatically. Renders stuck in the wake-up interstitial / behind
 * the Cloudflare challenge never respond from a browser either (observed
 * behavior), so we transparently fail over to the public sandbox backend.
 */
export function effectiveMlBackend(): { base: string; mode: MlMode; usingFallback: boolean } {
  const primary = resolveMlBackend();
  const usingFallback =
    renderUnreachableSince !== null && Date.now() - renderUnreachableSince > FALLBACK_TIMEOUT_MS;
  if (usingFallback && primary.base !== FALLBACK_BACKEND_URL) {
    return { base: FALLBACK_BACKEND_URL, mode: "direct", usingFallback: true };
  }
  return { ...primary, usingFallback: false };
}

/** Mark the primary endpoint unreachable (caller observed a fetch failure). */
export function markMlBackendUnreachable(): void {
  if (renderUnreachableSince === null) renderUnreachableSince = Date.now();
}

/** Reset the unreachable flag (e.g. after a successful response). */
export function markMlBackendReachable(): void {
  renderUnreachableSince = null;
}

/**
 * Build a timeout-aware fetch with optional retries.
 * Used because Render free-tier services cold-start (wake-up can take ~60s
 * on first request after idle).
 */
export async function mlFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number; maxAttempts?: number; attemptDelayMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 120_000;
  const maxAttempts = init?.maxAttempts ?? 1;
  const attemptDelayMs = init?.attemptDelayMs ?? 15_000;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetch(url, {
        ...(init ?? {}),
        signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, attemptDelayMs));
      }
    }
  }
  throw lastError;
}

/** Health-check the ML backend (status only — no model required to be ready). */
export async function checkMlHealth(): Promise<"online" | "offline"> {
  try {
    const { base } = resolveMlBackend();
    const resp = await fetch(`${base}/health`, { signal: AbortSignal.timeout(30_000) });
    if (resp.ok) {
      const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
      // Even while the model is loading, the service is reachable (warming).
      const ready = data?.model_ready ?? null;
      void ready;
      return "online";
    }
    return "offline";
  } catch {
    return "offline";
  }
}
