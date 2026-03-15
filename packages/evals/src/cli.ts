import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "@syntheci/db";

import { renderBenchmarkSummaryMarkdown, writeBenchmarkArtifacts } from "./report";
import { runBenchmarkSuites } from "./runtime";

function parseCliArgs(argv: string[]) {
  const workspaceCwd = process.env.INIT_CWD ?? process.cwd();
  const args = {
    outDir: resolve(workspaceCwd, "benchmark-reports")
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-dir") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for --out-dir");
      }

      args.outDir = resolve(workspaceCwd, nextValue);
      index += 1;
    }
  }

  return args;
}

export async function runBenchmarkCli(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  const report = await runBenchmarkSuites();
  const artifacts = await writeBenchmarkArtifacts(report, {
    baseDir: args.outDir
  });

  console.log("[benchmark] Benchmark run completed.");
  console.log(`[benchmark] Output directory: ${artifacts.outputDir}`);
  console.log(`[benchmark] JSON report: ${artifacts.jsonPath}`);
  console.log(`[benchmark] Markdown report: ${artifacts.markdownPath}`);
  console.log(`[benchmark] Markdown summary: ${artifacts.summaryPath}`);
  console.log("");
  console.log(renderBenchmarkSummaryMarkdown(report));

  return {
    report,
    artifacts
  };
}

async function main() {
  try {
    await runBenchmarkCli();
  } catch (error) {
    console.error("[benchmark] Benchmark run failed", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void main();
}
