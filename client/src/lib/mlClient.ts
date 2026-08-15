/**
 * ML client — direct browser calls to the ML backend.
 *
 * Architecture (Option C, user-chosen): the browser calls the ML backend
 * directly (no proxy). Render is the primary endpoint; when it fails to
 * respond within a short probe window the client transparently fails over to
 * the public sandbox fallback backend so the UI never hangs.
 *
 * Hard guarantees for the analyze flow:
 *  - Total budget per request: 30s. After 30s the UI shows a clear error.
 *  - The wake-up check ("Checking (Render may be waking up)...") was removed;
 *    the UI never enters an endless loading state.
 *  - Automatic retry: the Render endpoint is probed once with a short
 *    deadline; on failure (or a Cloudflare-style interstitial) the request is
 *    immediately retried against the sandbox fallback.
 */

/** Deployed ML backend on Render (primary production endpoint). */
const RENDER_BACKEND_URL = "https://retinavision-ml-backend.onrender.com";

/** Fallback sandbox ML backend (public URL of the Flask backend in the Manus sandbox).
 *  Used automatically when the Render endpoint does not respond within the
 *  probe window. */
const FALLBACK_BACKEND_URL = "https://8000-i5ydqj0z7cacur3n4uku0-89aa4dc5.sg1.manus.computer";

export type MlMode = "direct" | "proxy";

/** Maximum budget for a single request (per user requirement: 30s). */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Short probe deadline for the primary endpoint before instant failover. */
export const PRIMARY_PROBE_MS = 8_000;

/**
 * Resolve the ML backend base URL.
 * - VITE_ML_BACKEND_URL set explicitly -> use it (custom deployment override)
 * - dev sandbox -> local Flask reachable via the Express proxy only.
 * - deployed production site -> sandbox fallback directly (Render free-tier
 *   is blocked by the Cloudflare challenge from browsers).
 * The result `base` has no trailing slash; `mode` tells callers how to reach it.
 */
export function resolveMlBackend(): { base: string; mode: MlMode } {
  const envUrl = import.meta.env.VITE_ML_BACKEND_URL as string | undefined;
  if (envUrl) {
    return { base: envUrl.replace(/\/+$/, ""), mode: "direct" };
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return { base: "/api/ml", mode: "proxy" };
  }
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".manus.space")) {
    return { base: FALLBACK_BACKEND_URL, mode: "direct" };
  }
  return { base: RENDER_BACKEND_URL, mode: "direct" };
}

/** One-time probe result for the primary endpoint (kept for the session). */
let primaryProbed = false;
let primaryOk = false;

/** Mark the primary endpoint unreachable (caller observed a fetch failure). */
export function markMlBackendUnreachable(): void {
  primaryProbed = true;
  primaryOk = false;
}

/** Reset the unreachable flag (e.g. after a successful response). */
export function markMlBackendReachable(): void {
  primaryProbed = true;
  primaryOk = true;
}

/**
 * Race-based hard timeout: AbortSignal.timeout() is not reliable in all
 * browser environments for requests stalled at the TLS/network layer. A
 * manual AbortController plus a racing timer guarantees the promise always
 * rejects on timeout.
 */
function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? REQUEST_TIMEOUT_MS;
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new DOMException("Request timed out", "TimeoutError")),
      timeoutMs,
    );
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
    Promise.resolve()
      .then(() =>
        fetch(url, {
          ...init,
          signal: controller.signal,
        }),
      )
      .then((r) => {
        clearTimeout(timer);
        clearTimeout(abortTimer);
        resolve(r);
      })
      .catch((e) => {
        clearTimeout(timer);
        clearTimeout(abortTimer);
        reject(e);
      });
  });
}

/**
 * Call a URL with the primary endpoint first (short probe). If the primary
 * does not respond within PRIMARY_PROBE_MS, immediately retry against the
 * sandbox fallback with the remaining time budget. Never takes more than
 * REQUEST_TIMEOUT_MS total.
 */
export async function mlFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number; maxAttempts?: number },
): Promise<Response> {
  const budgetMs = init?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxAttempts = init?.maxAttempts ?? 1;
  const primary = resolveMlBackend();

  // Skip the primary entirely if a previous probe already proved it broken.
  const tryPrimary = !primaryProbed || primaryOk;

  async function attempt(base: string, remainingMs: number): Promise<Response> {
    const start = Date.now();
    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const spent = Date.now() - start;
      const attemptBudget = Math.max(2_000, Math.min(remainingMs - spent * attempt, remainingMs));
      try {
        const resp = await fetchWithTimeout(`${base}${path}`, { ...(init ?? {}), timeoutMs: attemptBudget });
        // Render's Cloudflare bot challenge returns an HTML interstitial
        // (200 OK, text/html) instead of JSON. Treat it as unreachable.
        if (resp.ok && resp.headers.get("content-type")?.includes("text/html")) {
          const body = await resp.text().catch(() => "");
          if (!body.trim().startsWith("{")) {
            throw new DOMException("Non-JSON response (service interstitial)", "NetworkError");
          }
        }
        if (resp.ok) return resp;
        lastError = new Error(`HTTP ${resp.status}`);
      } catch (err) {
        lastError = err;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }
    throw lastError;
  }

  if (tryPrimary) {
    try {
      const resp = await attempt(primary.base, PRIMARY_PROBE_MS);
      primaryProbed = true;
      primaryOk = true;
      return resp;
    } catch {
      primaryProbed = true;
      primaryOk = false;
    }
  }

  // Failover: sandbox fallback with whatever budget remains (never exceeds 30s total).
  return attempt(FALLBACK_BACKEND_URL, budgetMs);
}

/** Health-check the ML backend (status only — no model required to be ready). */
export async function checkMlHealth(): Promise<"online" | "offline"> {
  try {
    const resp = await mlFetch("/health", { timeoutMs: REQUEST_TIMEOUT_MS });
    if (resp.ok) {
      const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
      const ready = data?.model_ready ?? null;
      void ready;
      return "online";
    }
    return "offline";
  } catch {
    return "offline";
  }
}
