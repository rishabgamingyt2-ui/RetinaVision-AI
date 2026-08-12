import { Router, Request, Response } from "express";
import express from "express";

/**
 * ML Backend Proxy
 * Forwards /api/ml/* requests to the Flask ML backend (EfficientNet-B0 inference).
 * This allows the frontend to use same-origin requests (no CORS issues, no
 * need for external deployment URLs in development).
 *
 * The Flask backend URL is configurable via VITE_ML_BACKEND_URL or defaults to
 * http://localhost:8000 (the sandbox Flask dev server).
 */

const ML_BACKEND_URL =
  process.env.VITE_ML_BACKEND_URL || process.env.ML_BACKEND_URL || "http://localhost:8000";

export function registerMLProxy(app: Router) {
  // Raw body parser for multipart/form-data (don't parse, just collect buffer)
  app.use("/api/ml", express.raw({ type: "*/*", limit: "50mb" }));

  app.use("/api/ml", async (req: Request, res: Response) => {
    try {
      const targetPath = req.originalUrl.replace(/^\/api\/ml/, "");
      const targetUrl = `${ML_BACKEND_URL}${targetPath}`;

      // For GET requests (health check, model-info), just forward
      if (req.method === "GET") {
        const resp = await fetch(targetUrl, {
          method: "GET",
          headers: req.headers as Record<string, string>,
          signal: AbortSignal.timeout(10000),
        });
        const body = await resp.json().catch(() => ({}));
        res.status(resp.status).json(body);
        return;
      }

      // For POST requests (predict), forward the multipart form data
      if (req.method === "POST") {
        const contentType = req.headers["content-type"];
        const resp = await fetch(targetUrl, {
          method: "POST",
          headers: {
            ...(contentType ? { "Content-Type": contentType } : {}),
          },
          body: req.body instanceof Buffer ? new Uint8Array(req.body) : (req.body as BodyInit),
          signal: AbortSignal.timeout(120000), // 2 min for large images
        });
        const body = await resp.json().catch(() => ({}));
        res.status(resp.status).json(body);
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
      console.error("[ML Proxy] Error:", error.message);
      res.status(502).json({
        error: "ML backend unavailable. Make sure the Flask server is running.",
        details: error.message,
      });
    }
  });
}
