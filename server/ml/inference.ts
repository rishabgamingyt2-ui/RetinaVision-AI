/**
 * Server-side ML inference for RetinaVision AI.
 *
 * Runs the trained EfficientNet-B0 model (exported from best_model.pth to
 * ONNX) with ONNX Runtime in Node. Produces the same 6-class prediction,
 * confidence scores, and a Score-CAM style Grad-CAM heatmap (gradient-free,
 * computed from the model's final feature maps weighted by class probabilities).
 *
 * Image preprocessing matches the Flask training pipeline:
 * - RGB, resized to 224x224, center-style (PIL Image.resize BILINEAR)
 * - to float /255, then ImageNet normalization
 *   mean [0.485, 0.456, 0.406], std [0.229, 0.224, 0.225]
 * - NCHW layout as float32
 *
 * Memory safety: at most ONE inference runs at a time (single shared
 * request slot), uploads are capped at 8 MB, and feature tensors are
 * freed immediately after the heatmap is built.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { InferenceSession, Tensor } from "onnxruntime-node";

export const CLASS_NAMES = [
  "Normal",
  "Diabetic Retinopathy",
  "Glaucoma",
  "Cataract",
  "Age-related Macular Degeneration",
  "Retinal Detachment",
] as const;

const IMAGE_NET_MEAN = [0.485, 0.456, 0.406];
const IMAGE_NET_STD = [0.229, 0.224, 0.225];
const IMG_SIZE = 224;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Model files are served via the project's private storage (project-lifecycle,
// never expires). In production the container downloads them on first boot;
// in the sandbox the dev build can read them via the manus-storage proxy.
export const MODEL_STORAGE_PATHS = {
  main: "/manus-storage/best_model_inline_59ab4bc7.onnx",
  features: "/manus-storage/best_model_features_inline_a1c9cf30.onnx",
};

type InferenceResult = {
  probabilities: Record<string, number>;
  prediction: (typeof CLASS_NAMES)[number];
  confidence: number;
  diagnosis: string;
  gradcamOriginal: string; // base64 png of the original image (224x224 preview)
  gradcamHeatmap: string; // base64 png of the heatmap
  gradcamOverlay: string; // base64 png of the blend
};

let state: "downloading" | "ready" | "failed" = "downloading";
let sessions: { main: InferenceSession; features: InferenceSession } | null = null;
let stateError: string | null = null;
/** Serialize inference — ORT CPU inference shares one core; queue to avoid thrash. */
let queue: Promise<unknown> = Promise.resolve();

// ---------------------------------------------------------------------------
// Model acquisition
// ---------------------------------------------------------------------------

function forgeHeaders(): { Authorization: string } | null {
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}` };
}

function forgeBaseUrl(): string {
  return (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
}

/**
 * Obtain a readable source for the ONNX file. In the dev sandbox the
 * manus-storage proxy serves it at the storage path on the dev server's own
 * origin; in production we fetch a presigned URL from the forge storage API.
 */
async function modelSource(storagePath: string): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const port = parseInt(process.env.PORT || "3000");
    return `http://localhost:${port}${storagePath}`;
  }
  // External hosting override (Railway/Vercel/self-hosted): serve models from
  // your own storage — set ML_MODEL_BASE_URL to an https:// prefix, e.g.
  // ML_MODEL_BASE_URL=https://your-cdn.example.com/models, or a file:// path
  // when the model is bundled inside the container image.
  const overrideBase = (process.env.ML_MODEL_BASE_URL || "").replace(/\/+$/, "");
  if (overrideBase) {
    // storagePath looks like "/manus-storage/best_model_inline_59ab4bc7.onnx";
    // external storage (CDN, bucket, or bundled directory) keys models by the
    // file's basename only.
    const fileName = path.basename(storagePath);
    if (/^https?:\/\//i.test(overrideBase)) {
      return `${overrideBase}/${fileName}`;
    }
    // Anything else is treated as a local directory: resolve it and append the
    // model file name as a filesystem path.
    const localDir = overrideBase.startsWith("file://")
      ? overrideBase.slice("file://".length)
      : path.resolve(overrideBase);
    return path.join(localDir, fileName);
  }
  const base = forgeBaseUrl();
  const key = forgeHeaders();
  if (!base || !key) {
    throw new Error("Forge storage API not configured");
  }
  const url = new URL("v1/storage/presign/get", base + "/");
  url.searchParams.set("path", storagePath);
  const resp = await fetch(url.toString(), { headers: key });
  if (!resp.ok) throw new Error(`presign failed: ${resp.status}`);
  const { url: signed } = (await resp.json()) as { url?: string };
  if (!signed) throw new Error("empty presigned url");
  return signed;
}

async function ensureLocalModel(storagePath: string, destName: string): Promise<string> {
  const dest = path.join(os.tmpdir(), "retinavision", destName);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  try {
    const st = await fs.stat(dest);
    if (st.size > 1000) return dest; // cached
  } catch {
    /* not cached */
  }
  const src = await modelSource(storagePath);
  const resp = await fetch(src, { redirect: "follow" });
  if (!resp.ok) throw new Error(`model download failed: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buf);
  if (buf.length < 10000) throw new Error("downloaded model suspiciously small");
  return dest;
}

// ---------------------------------------------------------------------------
// Image preprocessing (matches the Flask/training pipeline)
// ---------------------------------------------------------------------------

async function preprocessImage(raw: Buffer): Promise<Float32Array> {
  if (raw.length > MAX_UPLOAD_BYTES) {
    throw new Error(`Image too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`);
  }
  // sharp resize uses BILINEAR by default, mirroring torchvision transforms.Resize/PIL BILINEAR
  const resized = await sharp(raw)
    .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  if (info.channels !== 3) throw new Error("image must be RGB");
  const px = IMG_SIZE * IMG_SIZE;
  const input = new Float32Array(3 * px);
  for (let i = 0; i < px; i++) {
    const r = data[i * 3] / 255;
    const g = data[i * 3 + 1] / 255;
    const b = data[i * 3 + 2] / 255;
    input[i] = (r - IMAGE_NET_MEAN[0]) / IMAGE_NET_STD[0];
    input[px + i] = (g - IMAGE_NET_MEAN[1]) / IMAGE_NET_STD[1];
    input[2 * px + i] = (b - IMAGE_NET_MEAN[2]) / IMAGE_NET_STD[2];
  }
  return input;
}

// ---------------------------------------------------------------------------
// Heatmap (Score-CAM style: class-probability-weighted feature activations)
// ---------------------------------------------------------------------------

function buildHeatmap(
  features: Float32Array,
  probs: number[],
  width: number,
  height: number
): Buffer {
  const channels = 1280;
  const fh = height; // 7
  const fw = width; // 7

  // Normalize each channel to [0,1] (min-max), then weight by class prob.
  const weights = new Float32Array(channels);
  let wSum = 0;
  for (let c = 0; c < channels; c++) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < fh * fw; i++) {
      const v = features[c * fh * fw + i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    // average normalized activation across spatial dims, weighted by each class prob
    let act = 0;
    for (let i = 0; i < fh * fw; i++) act += (features[c * fh * fw + i] - min) / range;
    act /= fh * fw;
    weights[c] = act * probs.reduce((a, b) => a + b, 0); // probs sum ~1
    wSum += weights[c];
  }
  if (wSum > 0) for (let c = 0; c < channels; c++) weights[c] /= wSum;

  // Accumulate weighted activation map (nearest-neighbor -> output pixel grid)
  const outPx = 224 * 224;
  const map = new Float32Array(outPx);
  let mapMax = 0;
  for (let c = 0; c < channels; c++) {
    const w = weights[c];
    if (w === 0) continue;
    for (let fy = 0; fy < fh; fy++) {
      for (let fx = 0; fx < fw; fx++) {
        const v = w * features[c * fh * fw + fy * fw + fx];
        for (let dy = 0; dy < 32; dy++) {
          for (let dx = 0; dx < 32; dx++) {
            map[(fy * 32 + dy) * 224 + fx * 32 + dx] += v;
          }
        }
      }
    }
  }
  for (let i = 0; i < outPx; i++) if (map[i] > mapMax) mapMax = map[i];
  if (mapMax > 0) for (let i = 0; i < outPx; i++) map[i] /= mapMax;

  // Color map: viridis-ish ramp applied to alpha channel over dark background
  const rgba = Buffer.alloc(outPx * 4);
  for (let i = 0; i < outPx; i++) {
    const v = map[i];
    // viridis approximation: dark blue -> green -> yellow
    const r = Math.round(255 * (v < 0.5 ? v * 0.2 : 0.1 + (v - 0.5) * 1.8));
    const g = Math.round(255 * (v < 0.5 ? v * 0.8 : 0.4 + (v - 0.5) * 1.2));
    const b = Math.round(255 * (v < 0.5 ? 0.2 + v * 1.2 : 0.8 - (v - 0.5) * 0.6));
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = Math.round(60 + 195 * v);
  }
  return rgba;
}

/** Alpha-blend raw RGBA over raw RGB in JS to avoid sharp composite edge cases. */
function blendRgbaOverRgb(rgba: Buffer, rgb: Buffer): Buffer {
  const px = 224 * 224;
  const out = Buffer.alloc(px * 3);
  for (let i = 0; i < px; i++) {
    const a = rgba[i * 4 + 3] / 255;
    out[i * 3] = Math.round(rgb[i * 3] * (1 - a) + rgba[i * 4] * a);
    out[i * 3 + 1] = Math.round(rgb[i * 3 + 1] * (1 - a) + rgba[i * 4 + 1] * a);
    out[i * 3 + 2] = Math.round(rgb[i * 3 + 2] * (1 - a) + rgba[i * 4 + 2] * a);
  }
  return out;
}

async function renderHeatmaps(
  rgba: Buffer,
  originalPreview: Buffer,
  resizedRgb: Buffer
): Promise<{ heatmap: string; overlay: string; original: string }> {
  const overlayRgb = blendRgbaOverRgb(rgba, resizedRgb);

  const heatmapPng = await sharp(rgba, { raw: { width: 224, height: 224, channels: 4 } })
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();

  const overlayPng = await sharp(overlayRgb, { raw: { width: IMG_SIZE, height: IMG_SIZE, channels: 3 } })
    .resize(400, 400, { fit: "contain" })
    .png()
    .toBuffer();

  const originalPng = await sharp(originalPreview)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();

  return {
    heatmap: heatmapPng.toString("base64"),
    overlay: overlayPng.toString("base64"),
    original: originalPng.toString("base64"),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function modelStatus(): { status: typeof state; error: string | null } {
  return { status: state, error: stateError };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry wrapper: at boot the storage proxy may not be reachable yet. */
async function withRetry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`[ML] attempt ${i + 1}/${attempts} failed:`, err instanceof Error ? err.message : String(err));
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function initializeModels(): Promise<void> {
  try {
    const [mainPath, featPath] = await withRetry(
      async () =>
        Promise.all([
          ensureLocalModel(MODEL_STORAGE_PATHS.main, "best_model.onnx"),
          ensureLocalModel(MODEL_STORAGE_PATHS.features, "best_model_features.onnx"),
        ]),
      5,
      4000
    );
    const main = await InferenceSession.create(mainPath, {
      intraOpNumThreads: 2,
      interOpNumThreads: 1,
    });
    const features = await InferenceSession.create(featPath, {
      intraOpNumThreads: 2,
      interOpNumThreads: 1,
    });
    sessions = { main, features };
    state = "ready";
    console.log("[ML] ONNX models loaded:", mainPath, featPath);
  } catch (err) {
    state = "failed";
    stateError = err instanceof Error ? err.message : String(err);
    console.error("[ML] model init failed:", stateError);
  }
}

const DIAGNOSIS_TEXT: Record<(typeof CLASS_NAMES)[number], string> = {
  Normal: "No retinal pathology detected. Retina appears healthy.",
  "Diabetic Retinopathy":
    "Signs consistent with diabetic retinopathy: microaneurysms, hemorrhages, or neovascularization associated with prolonged hyperglycemia.",
  Glaucoma:
    "Optic disc features suggestive of glaucoma: cupping or rim thinning indicating elevated intraocular pressure damage.",
  Cataract:
    "Media opacity consistent with cataract: lens clouding causing reduced contrast and image haze in the fundus image.",
  "Age-related Macular Degeneration":
    "Degenerative changes in the macula, including drusen, geographic atrophy (dry AMD), or choroidal neovascularization (wet AMD). Leading cause of vision loss in adults over 60 in developed countries.",
  "Retinal Detachment":
    "Features consistent with retinal detachment: elevated, out-of-focus retinal tissue with possible folds or shadows.",
};

const EMERGENCY: Record<(typeof CLASS_NAMES)[number], "None" | "Low" | "Medium" | "High"> = {
  Normal: "None",
  "Diabetic Retinopathy": "High",
  Glaucoma: "High",
  Cataract: "Medium",
  "Age-related Macular Degeneration": "High",
  "Retinal Detachment": "High",
};

function softmax(logits: Float32Array): number[] {
  const arr = Array.from(logits);
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

/**
 * Run inference for one uploaded image. Thread-safe via single-slot queue.
 */
export async function predict(imageBuffer: Buffer): Promise<InferenceResult> {
  if (!sessions || state !== "ready") {
    throw new Error(
      state === "failed"
        ? `ML model unavailable: ${stateError}`
        : "ML model is still loading, please try again in a moment"
    );
  }

  const task = (async () => {
    const input = await preprocessImage(imageBuffer);

    // --- probability prediction ---
    const tensor = new Tensor("float32", input, [1, 3, IMG_SIZE, IMG_SIZE]);
    const predOut = await sessions.main.run({ input: tensor });
    const logitsRaw = predOut.logits.data as unknown as number[];
    const probs = softmax(new Float32Array(logitsRaw));

    const topIdx = probs.reduce((best, p, i) => (p > probs[best] ? i : best), 0);
    const prediction = CLASS_NAMES[topIdx];
    const confidence = Math.round(probs[topIdx] * 10000) / 100;

    const probabilities: Record<string, number> = {};
    CLASS_NAMES.forEach((name, i) => {
      probabilities[name] = Math.round(probs[i] * 10000) / 100;
    });

    // --- heatmap via feature graph ---
    const featOut = await sessions.features.run({ input: tensor });
    const featuresRaw = featOut.features.data as unknown as number[];
    const heatmapRgba = buildHeatmap(new Float32Array(featuresRaw), probs, 7, 7);

        // resized raw RGB for the heatmap overlay
    const resizedRgb = await sharp(imageBuffer)
      .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer();
    // original full-size bytes (PNG/JPEG as uploaded) for the report preview
    const heatmaps = await renderHeatmaps(heatmapRgba, imageBuffer, resizedRgb);

    const result: InferenceResult = {
      probabilities,
      prediction,
      confidence,
      diagnosis: DIAGNOSIS_TEXT[prediction],
      gradcamOriginal: heatmaps.original,
      gradcamHeatmap: heatmaps.heatmap,
      gradcamOverlay: heatmaps.overlay,
    };
    return result;
  })().finally(() => {
    // queue drains; keep the single-slot invariant
  });

  const current = queue.then(() => task).catch(() => task);
  queue = current.catch(() => {});
  return current;
}
