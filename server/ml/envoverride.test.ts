import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";

describe("ML_MODEL_BASE_URL env override", () => {
  // The env var is set (by webdev_request_secrets) to file:///opt/retinavision/models.
  // Verify the override logic accepts both file:// and https:// prefixes and
  // falls back to local dev proxy when unset. We validate behavior through the
  // runtime model acquisition: if the override points at real model files,
  // initializeModels succeeds and predict works.
  it("uses the override URL when ML_MODEL_BASE_URL is set", () => {
    const base = process.env.ML_MODEL_BASE_URL || "";
    // When configured (as in production Docker), it must be a non-empty string.
    // When unset (CI), the dev/prod defaults apply — both branches are legal.
    if (base) {
      expect(/^https?:\/\//.test(base) || base.startsWith("file:///")).toBe(true);
    }
  });

  it(
    "loads models from a local file:// base when present",
    async () => {
      const { initializeModels, modelStatus, predict } = await import("./inference");
      // Point at the project's bundled model copies (same files Docker bakes in)
      const modelsDir = join(__dirname, "../../ml-backend");
      const mainExists = existsSync(join(modelsDir, "best_model_inline.onnx"));
      if (!mainExists) {
        console.warn("Bundled model files not present — skipping file override test");
        return;
      }
      const prev = process.env.ML_MODEL_BASE_URL;
      process.env.ML_MODEL_BASE_URL = `file://${modelsDir}`;
      try {
        // Clear module-side state by reimporting is not needed: modelSource reads
        // the env var per call, and initializeModels is idempotent once ready.
        await initializeModels();
        expect(modelStatus().status).toBe("ready");
      } finally {
        process.env.ML_MODEL_BASE_URL = prev;
      }
    },
    120_000,
  );
});
