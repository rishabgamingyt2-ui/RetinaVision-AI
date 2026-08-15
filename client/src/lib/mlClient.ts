/**
 * ML client — self-contained architecture (v4, internal ONNX).
 *
 * The web app's own Express server now runs the trained EfficientNet-B0 model
 * (exported to ONNX) natively via onnxruntime-node. All ML traffic goes to
 * the same-origin endpoints:
 *   GET  /api/ml/health  — model status
 *   POST /api/ml/predict — multipart image upload, real inference
 *
 * Hard guarantees for the analyze flow:
 *  - Total budget per request: 30s. After 30s the UI shows a clear error.
 *  - The UI never enters an endless loading state.
 *  - Race-based AbortController timeout — network-stalled requests are always
 *    aborted and surfaced as a visible error.
 */

/** Hard per-request budget (per user requirement: 30s). */
export const REQUEST_TIMEOUT_MS = 30_000;

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

export interface MlHealth {
  status: "online" | "offline" | "loading";
  model?: string;
  classes?: number;
  error?: string | null;
}

/** Health-check the ML backend. */
export async function checkMlHealth(): Promise<MlHealth> {
  try {
    const resp = await fetchWithTimeout("/api/ml/health", { timeoutMs: REQUEST_TIMEOUT_MS });
    if (!resp.ok) return { status: "offline" };
    const data = (await resp.json().catch(() => null)) as { status?: string; model?: string; classes?: number; error?: string } | null;
    if (data?.status === "online") {
      return { status: "online", model: data.model, classes: data.classes };
    }
    if (data?.status === "loading") return { status: "loading" };
    return { status: "offline", error: data?.error ?? "unavailable" };
  } catch {
    return { status: "offline", error: "backend unreachable" };
  }
}

export interface PredictionResult {
  prediction: string;
  confidence: number;
  diagnosis: string;
  probabilities: Record<string, number>;
  gradcam: {
    original: string;
    heatmap: string;
    overlay: string;
  };
  model: string;
  backend: string;
}

/**
 * Upload an image for real model inference. Uses fetchWithTimeout so a
 * stalled response always fails fast with a clear error instead of hanging.
 */
export async function analyzeImage(file: File): Promise<PredictionResult> {
  const form = new FormData();
  form.append("image", file);
  const resp = await fetchWithTimeout("/api/ml/predict", {
    method: "POST",
    body: form,
    timeoutMs: REQUEST_TIMEOUT_MS,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    let msg = `HTTP ${resp.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.error ?? parsed.details ?? msg;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }
  return (await resp.json()) as PredictionResult;
}
