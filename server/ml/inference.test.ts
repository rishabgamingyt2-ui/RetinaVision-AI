import { describe, expect, it, beforeAll } from "vitest";
import { predict, modelStatus, initializeModels } from "./inference";

// Vitest imports inference.ts directly (not through the router), so kick off
// the lazy model bootstrapping the same way the Express router does.
beforeAll(async () => {
  await initializeModels();
});
import { readFileSync } from "fs";
import { join } from "path";

// Sample retina image used across E2E verification (38 KB PNG).
const SAMPLE = join(__dirname, "../../ml-backend/test_retina.png");

const sampleBytes = readFileSync(SAMPLE);

describe("ONNX ML inference pipeline", () => {
  it("reports the model as ready with EfficientNet-B0 metadata", () => {
    const status = modelStatus();
    expect(status.status).toBe("ready");
  });

  it(
    "predicts one of the six retinal classes with probabilities summing to ~1",
    async () => {
      const result = await predict(sampleBytes);

      // Prediction must be one of the known classes
      const classes = Object.keys(result.probabilities);
      expect(classes.length).toBe(6);
      expect(classes).toContain(result.prediction);

      // Probabilities (percent) sum to approximately 100 (softmax output)
      const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(99);
      expect(sum).toBeLessThan(101);

      // Top confidence matches the predicted class probability
      const top = Math.max(...Object.values(result.probabilities));
      expect(result.confidence).toBe(top);
    },
    60_000,
  );

  it("returns Score-CAM heatmap PNGs for original, heatmap and overlay", async () => {
    const result = await predict(sampleBytes);
    for (const name of ["gradcamOriginal", "gradcamHeatmap", "gradcamOverlay"]) {
      const buf = result[name as keyof typeof result] as string;
      expect(typeof buf).toBe("string");
      expect(buf.length).toBeGreaterThan(1000);
      expect(buf.startsWith("iVBOR")).toBe(true); // base64 PNG header
    }
  });

  it("rejects an invalid image buffer with a clear error", async () => {
    await expect(predict(Buffer.from("not-an-image"))).rejects.toThrow();
  });
});
