import { Router, Request, Response } from "express";
import express from "express";

/**
 * ML Backend Proxy
 * Forwards /api/ml/* requests to the Flask ML backend (EfficientNet-B0 inference).
 * This allows the frontend to use same-origin requests (no CORS issues, no
 * need for external deployment URLs in development).
 *
 * Target resolution order:
 * 1. ML_BACKEND_URL (server-side runtime env)
 * 2. VITE_ML_BACKEND_URL (build-time env)
 * 3. http://localhost:8000 (sandbox Flask dev server — development only).
 *
 * In the deployed production runtime, ML_BACKEND_URL/VITE_ML_BACKEND_URL must
 * be set to the Render service URL; otherwise the proxy falls back to localhost
 * which is unreachable from production.
 */

const ML_BACKEND_URL =
  process.env.ML_BACKEND_URL || process.env.VITE_ML_BACKEND_URL || "http://localhost:8000";

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
          signal: AbortSignal.timeout(30000), // Render free-tier cold starts can exceed 10s
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
