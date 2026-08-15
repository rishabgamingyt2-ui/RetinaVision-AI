import { Router, Request, Response } from "express";
import busboy from "busboy";
import {
  predict,
  modelStatus,
  initializeModels,
  CLASS_NAMES,
} from "./inference";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function registerMLRouter(app: Router) {
  app.get("/api/ml/health", (_req: Request, res: Response) => {
    const { status, error } = modelStatus();
    if (status === "ready") {
      res.json({
        status: "online",
        model: "EfficientNet-B0 (ONNX)",
        classes: CLASS_NAMES.length,
      });
    } else if (status === "failed") {
      res.status(503).json({ status: "offline", error: error ?? "model unavailable" });
    } else {
      res.status(503).json({ status: "loading", message: "model is still initializing" });
    }
  });

  app.post("/api/ml/predict", (req: Request, res: Response) => {
    // parse multipart/form-data with busboy, collect the `image` part
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(415).json({ error: "Expected multipart/form-data upload" });
      return;
    }

    const bb = busboy({ headers: req.headers, limits: { files: 1, fieldSize: MAX_UPLOAD_BYTES } });
    let imageBuffer: Buffer | null = null;
    let settled = false;

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      handler();
    };

    bb.on("file", (name, stream, info) => {
      if (name !== "image") {
        stream.resume();
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_UPLOAD_BYTES) {
          stream.destroy();
          finish(() => res.status(413).json({ error: `Image too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` }));
          return;
        }
        chunks.push(chunk);
      });
      stream.on("end", () => {
        if (!settled) imageBuffer = Buffer.concat(chunks);
      });
      stream.on("error", () => {
        finish(() => res.status(400).json({ error: "Failed to read uploaded image" }));
      });
    });

    bb.on("finish", async () => {
      if (!imageBuffer || imageBuffer.length === 0) {
        finish(() => res.status(400).json({ error: "No image file uploaded (expected part named 'image')" }));
        return;
      }
      try {
        const result = await predict(imageBuffer);
        res.json({
          prediction: result.prediction,
          confidence: result.confidence,
          diagnosis: result.diagnosis,
          probabilities: result.probabilities,
          gradcam: {
            original: `data:image/png;base64,${result.gradcamOriginal}`,
            heatmap: `data:image/png;base64,${result.gradcamHeatmap}`,
            overlay: `data:image/png;base64,${result.gradcamOverlay}`,
          },
          model: "EfficientNet-B0 (ONNX)",
          backend: "node",
        });
      } catch (err) {
        const msg = err instanceof Error ? (err.stack || err.message).split("\n").join(" | ") : "Unknown inference error";
        if (msg.includes("still loading")) {
          res.status(503).json({ error: msg });
        } else {
          console.error("[ML predict] error:", msg);
          res.status(500).json({ error: "Prediction failed", details: msg });
        }
      }
    });

    bb.on("error", () => {
      finish(() => res.status(400).json({ error: "Malformed upload" }));
    });

    req.pipe(bb);
  });
}

// Kick off model loading in the background (non-blocking for the server boot)
initializeModels().catch(() => {
  /* errors are captured in modelStatus() */
});
