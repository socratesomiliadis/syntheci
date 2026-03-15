import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildBenchmarkOutputDir,
  renderBenchmarkReportMarkdown,
  renderBenchmarkSummaryMarkdown,
  writeBenchmarkArtifacts
} from "./report";
import type { BenchmarkMetric, BenchmarkRunReport, BenchmarkSuiteResult } from "./types";

function percentMetric(label: string, numerator: number, denominator: number): BenchmarkMetric {
  return {
    label,
    value: denominator === 0 ? 0 : numerator / denominator,
    format: "percent",
    numerator,
    denominator
  };
}

function msMetric(label: string, value: number): BenchmarkMetric {
  return {
    label,
    value,
    format: "ms"
  };
}

function buildMockSuite(suite: string): BenchmarkSuiteResult {
  return {
    suite,
    caseCount: 2,
    passCount: 1,
    failCount: 1,
    metrics: {
      accuracy: percentMetric("Accuracy", 1, 2),
      latencyMedianMs: msMetric("Median latency", 120),
      latencyP95Ms: msMetric("P95 latency", 250)
    },
    quoteSafeMetricKeys: ["accuracy", "latencyMedianMs", "latencyP95Ms"],
    latency: {
      samplesMs: [100, 120, 250],
      minMs: 100,
      maxMs: 250,
      medianMs: 120,
      p95Ms: 250
    },
    cases: [
      {
        id: `${suite}-pass`,
        passed: true
      },
      {
        id: `${suite}-fail`,
        passed: false
      }
    ]
  };
}

function buildMockReport(): BenchmarkRunReport {
  const retrievalSuite = {
    ...buildMockSuite("retrieval"),
    metrics: {
      recallAt5: percentMetric("Recall@5", 4, 5),
      mrr: percentMetric("MRR", 3.5, 5),
      latencyMedianMs: msMetric("Median retrieval latency", 111),
      latencyP95Ms: msMetric("P95 retrieval latency", 222)
    },
    quoteSafeMetricKeys: ["recallAt5", "mrr", "latencyMedianMs", "latencyP95Ms"]
  };
  const chatSuite = {
    ...buildMockSuite("chat_conclusions"),
    metrics: {
      exactMatchAccuracy: percentMetric("Exact match accuracy", 1, 2),
      multiDocumentAccuracy: percentMetric("Multi-document accuracy", 1, 1),
      singleDocumentAccuracy: percentMetric("Single-document accuracy", 0, 1),
      latencyMedianMs: msMetric("Median structured chat latency", 150),
      latencyP95Ms: msMetric("P95 structured chat latency", 310)
    },
    quoteSafeMetricKeys: [
      "exactMatchAccuracy",
      "multiDocumentAccuracy",
      "singleDocumentAccuracy",
      "latencyMedianMs",
      "latencyP95Ms"
    ]
  };
  const citationSuite = {
    ...buildMockSuite("citation_grounding"),
    metrics: {
      citationPrecision: percentMetric("Citation precision", 3, 4),
      citationCoverage: percentMetric("Citation coverage", 2, 2),
      latencyMedianMs: msMetric("Median citation latency", 170),
      latencyP95Ms: msMetric("P95 citation latency", 320)
    },
    quoteSafeMetricKeys: ["citationPrecision", "citationCoverage", "latencyMedianMs", "latencyP95Ms"]
  };
  const triageSuite = {
    ...buildMockSuite("triage"),
    metrics: {
      accuracy: percentMetric("Accuracy", 9, 10),
      latencyMedianMs: msMetric("Median triage latency", 90),
      latencyP95Ms: msMetric("P95 triage latency", 140)
    },
    quoteSafeMetricKeys: ["accuracy", "latencyMedianMs", "latencyP95Ms"]
  };
  const briefingSuite = {
    ...buildMockSuite("briefing"),
    metrics: {
      itemRecall: percentMetric("Briefing item recall", 4, 5),
      priorityCoverage: percentMetric("Priority coverage", 2, 2),
      latencyMedianMs: msMetric("Briefing latency", 210)
    },
    quoteSafeMetricKeys: ["itemRecall", "priorityCoverage", "latencyMedianMs"]
  };
  const meetingSuite = {
    ...buildMockSuite("meeting_extraction"),
    metrics: {
      intentAccuracy: percentMetric("Intent accuracy", 5, 5),
      timeExtractionAccuracy: percentMetric("Time extraction accuracy", 4, 5),
      latencyMedianMs: msMetric("Median meeting latency", 130),
      latencyP95Ms: msMetric("P95 meeting latency", 260)
    },
    quoteSafeMetricKeys: [
      "intentAccuracy",
      "timeExtractionAccuracy",
      "latencyMedianMs",
      "latencyP95Ms"
    ]
  };

  return {
    datasetName: "Demo benchmark",
    runAt: "2026-03-15T10:00:00.000Z",
    systemId: "syntheci-current-stack",
    models: {
      chatModel: "groq/llama",
      embeddingModel: "google/text-embedding"
    },
    seedSource: "apps/worker/src/bootstrap-demo.ts",
    objectiveMetricsOnly: true,
    totalCaseCount: 12,
    suites: {
      retrieval: retrievalSuite,
      citation_grounding: citationSuite,
      chat_conclusions: chatSuite,
      triage: triageSuite,
      briefing: briefingSuite,
      meeting_extraction: meetingSuite
    },
    summary: {
      retrievalRecallAt5: 0.8,
      retrievalMrr: 0.7,
      multiDocumentAccuracy: 1,
      singleDocumentAccuracy: 0,
      citationPrecision: 0.75,
      citationCoverage: 1,
      triageAccuracy: 0.9,
      briefingItemRecall: 0.8,
      briefingPriorityCoverage: 1,
      meetingIntentAccuracy: 1,
      meetingTimeAccuracy: 0.8
    }
  };
}

describe("benchmark reporting", () => {
  it("renders a pitch-ready summary markdown block", () => {
    const markdown = renderBenchmarkSummaryMarkdown(buildMockReport());

    expect(markdown).toContain("# Syntheci Benchmark Summary");
    expect(markdown).toContain("Retrieval Recall@5");
    expect(markdown).toContain("80.0%");
    expect(markdown).toContain("objective, reproducible measurements");
  });

  it("renders a detailed markdown report with suite sections", () => {
    const markdown = renderBenchmarkReportMarkdown(buildMockReport());

    expect(markdown).toContain("# Syntheci Benchmark Report");
    expect(markdown).toContain("## Suite Details");
    expect(markdown).toContain("## retrieval");
    expect(markdown).toContain("Quote-safe");
  });

  it("writes JSON and markdown artifacts to a timestamped directory", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "syntheci-benchmark-"));
    const report = buildMockReport();
    const artifacts = await writeBenchmarkArtifacts(report, { baseDir });

    expect(artifacts.outputDir).toBe(buildBenchmarkOutputDir(baseDir, report.runAt));

    const json = JSON.parse(await readFile(artifacts.jsonPath, "utf8")) as BenchmarkRunReport;
    const reportMarkdown = await readFile(artifacts.markdownPath, "utf8");
    const summaryMarkdown = await readFile(artifacts.summaryPath, "utf8");

    expect(json.datasetName).toBe(report.datasetName);
    expect(reportMarkdown).toContain("Syntheci Benchmark Report");
    expect(summaryMarkdown).toContain("Syntheci Benchmark Summary");
  });
});
