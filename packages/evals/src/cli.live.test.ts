import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const runLiveBenchmark = process.env.RUN_LIVE_BENCHMARK === "true";

describe.skipIf(!runLiveBenchmark)("benchmark CLI live smoke test", () => {
  it("runs the seeded benchmark and emits all three artifacts", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "syntheci-benchmark-live-"));
    const { pool } = await import("@syntheci/db");
    const { runBenchmarkCli } = await import("./cli");

    try {
      const { artifacts } = await runBenchmarkCli(["--out-dir", outDir]);

      expect(artifacts.jsonPath.endsWith("benchmark-report.json")).toBe(true);
      expect(artifacts.markdownPath.endsWith("benchmark-report.md")).toBe(true);
      expect(artifacts.summaryPath.endsWith("benchmark-summary.md")).toBe(true);
    } finally {
      await pool.end();
    }
  }, 300000);
});
