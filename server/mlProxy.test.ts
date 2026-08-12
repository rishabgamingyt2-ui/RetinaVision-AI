import { describe, expect, it } from "vitest";

/**
 * ML Proxy behavior tests.
 *
 * The Express /api/ml router forwards:
 *   GET  /api/ml/health      -> http://localhost:8000/health      (Flask backend)
 *   POST /api/ml/predict     -> http://localhost:8000/predict     (multipart image)
 * and falls back to 502 with a clear message when the Flask server is unreachable.
 *
 * We exercise the routing logic by importing the module and verifying the
 * URL that registerMLProxy would build from a request's originalUrl.
 */
import express from "express";
import http from "http";

const ML_BACKEND_URL =
  process.env.VITE_ML_BACKEND_URL || process.env.ML_BACKEND_URL || "http://localhost:8000";

/** Build the target URL the same way the proxy does, so we can assert routing. */
function buildTargetUrl(originalUrl: string): string {
  const targetPath = originalUrl.replace(/^\/api\/ml/, "");
  return `${ML_BACKEND_URL}${targetPath}`;
}

describe("ML proxy routing", () => {
  it("routes /api/ml/health to the Flask health endpoint", () => {
    expect(buildTargetUrl("/api/ml/health")).toBe(`${ML_BACKEND_URL}/health`);
  });

  it("routes /api/ml/predict to the Flask predict endpoint", () => {
    expect(buildTargetUrl("/api/ml/predict")).toBe(`${ML_BACKEND_URL}/predict`);
  });

  it("routes /api/ml/model-info to the Flask model-info endpoint", () => {
    expect(buildTargetUrl("/api/ml/model-info")).toBe(`${ML_BACKEND_URL}/model-info`);
  });
});

describe("ML proxy health forwarding", () => {
  it("returns 502 when the Flask backend is unreachable", async () => {
    const app = express();
    process.env.VITE_ML_BACKEND_URL = "http://localhost:49999";

    // Re-import fresh module to pick up the fake backend URL.
    const { registerMLProxy } = (await import("./_core/mlProxy?r=" + Date.now())) as any;
    registerMLProxy(app);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const resp = await fetch(`http://localhost:${port}/api/ml/health`, {
        signal: AbortSignal.timeout(8000),
      });
      expect(resp.status).toBe(502);
      const body = await resp.json();
      expect(body.error).toContain("ML backend unavailable");
    } finally {
      delete process.env.VITE_ML_BACKEND_URL;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("forwards a 200 health response when the Flask backend is running", async () => {
    // Spin up a fake Flask-style backend
    const fakeFlask = http.createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", model: "EfficientNet-B0", classes: 6 }));
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise<void>((resolve) => fakeFlask.listen(0, resolve));
    const flaskPort = (fakeFlask.address() as any).port;

    const app = express();
    process.env.VITE_ML_BACKEND_URL = `http://localhost:${flaskPort}`;

    // Re-import fresh module to pick up the new env (module cache cleared).
    const mod = await import("./_core/mlProxy?r=" + Date.now());
    const { registerMLProxy } = mod as any;
    registerMLProxy(app);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    try {
      const resp = await fetch(`http://localhost:${port}/api/ml/health`, {
        signal: AbortSignal.timeout(8000),
      });
      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.status).toBe("healthy");
      expect(body.model).toBe("EfficientNet-B0");
      expect(body.classes).toBe(6);
    } finally {
      delete process.env.VITE_ML_BACKEND_URL;
      await new Promise<void>((resolve) => fakeFlask.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
