import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { BenchmarkMetric, BenchmarkRunReport, BenchmarkSuiteResult } from "./types";

export interface BenchmarkArtifactPaths {
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
  summaryPath: string;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMilliseconds(value: number) {
  return `${Math.round(value)} ms`;
}

export function formatMetricValue(metric: BenchmarkMetric) {
  if (typeof metric.value === "string") {
    return metric.value;
  }

  if (metric.format === "percent") {
    return formatPercent(metric.value);
  }

  if (metric.format === "ms") {
    return formatMilliseconds(metric.value);
  }

  return String(metric.value);
}

function formatMetricTrace(metric: BenchmarkMetric) {
  if (metric.format !== "percent") {
    return "";
  }

  if (metric.numerator === undefined || metric.denominator === undefined) {
    return "";
  }

  return ` (${metric.numerator}/${metric.denominator})`;
}

function metricTableLines(suite: BenchmarkSuiteResult) {
  const metricRows = Object.entries(suite.metrics).map(([key, metric]) => {
    const quoteSafe = suite.quoteSafeMetricKeys.includes(key) ? "Yes" : "No";
    return `| ${metric.label} | ${formatMetricValue(metric)}${formatMetricTrace(metric)} | ${quoteSafe} |`;
  });

  return ["| Metric | Value | Quote-safe |", "| --- | ---: | --- |", ...metricRows].join("\n");
}

function failureCountForSuite(suite: BenchmarkSuiteResult) {
  return suite.cases.filter((benchmarkCase) => {
    const record = benchmarkCase as Record<string, unknown>;
    return record.passed === false || record.allRequiredAt5 === false;
  }).length;
}

function renderSuiteSection([suiteKey, suite]: [string, BenchmarkSuiteResult]) {
  const casePreview = suite.cases.slice(0, 5).map((benchmarkCase) => {
    const record = benchmarkCase as Record<string, unknown>;
    return `- \`${String(record.id ?? "unknown-case")}\`: ${JSON.stringify(record)}`;
  });

  const previewLines = casePreview.length > 0 ? casePreview.join("\n") : "- No case details captured.";

  return [
    `## ${suiteKey}`,
    "",
    `Cases: ${suite.caseCount} | Pass: ${suite.passCount} | Fail: ${suite.failCount} | Debug failures detected: ${failureCountForSuite(suite)}`,
    "",
    metricTableLines(suite),
    "",
    "Sample case results:",
    previewLines
  ].join("\n");
}

function quoteSafeSummaryRows(report: BenchmarkRunReport) {
  return [
    ["Retrieval Recall@5", formatPercent(report.summary.retrievalRecallAt5)],
    ["Retrieval MRR", formatPercent(report.summary.retrievalMrr)],
    ["Citation precision", formatPercent(report.summary.citationPrecision)],
    ["Citation coverage", formatPercent(report.summary.citationCoverage)],
    ["Multi-document conclusion accuracy", formatPercent(report.summary.multiDocumentAccuracy)],
    ["Single-document conclusion accuracy", formatPercent(report.summary.singleDocumentAccuracy)],
    ["Triage accuracy", formatPercent(report.summary.triageAccuracy)],
    ["Briefing item recall", formatPercent(report.summary.briefingItemRecall)],
    ["Briefing priority coverage", formatPercent(report.summary.briefingPriorityCoverage)],
    ["Meeting intent accuracy", formatPercent(report.summary.meetingIntentAccuracy)],
    ["Meeting time exact-match rate", formatPercent(report.summary.meetingTimeAccuracy)],
    [
      "Retrieval latency (median / p95)",
      `${formatMilliseconds(report.suites.retrieval.metrics.latencyMedianMs.value as number)} / ${formatMilliseconds(report.suites.retrieval.metrics.latencyP95Ms.value as number)}`
    ],
    [
      "Structured chat latency (median / p95)",
      `${formatMilliseconds(report.suites.chat_conclusions.metrics.latencyMedianMs.value as number)} / ${formatMilliseconds(report.suites.chat_conclusions.metrics.latencyP95Ms.value as number)}`
    ],
    [
      "Triage latency (median / p95)",
      `${formatMilliseconds(report.suites.triage.metrics.latencyMedianMs.value as number)} / ${formatMilliseconds(report.suites.triage.metrics.latencyP95Ms.value as number)}`
    ],
    [
      "Meeting extraction latency (median / p95)",
      `${formatMilliseconds(report.suites.meeting_extraction.metrics.latencyMedianMs.value as number)} / ${formatMilliseconds(report.suites.meeting_extraction.metrics.latencyP95Ms.value as number)}`
    ]
  ];
}

function renderQuoteSafeSummaryTable(report: BenchmarkRunReport) {
  const rows = quoteSafeSummaryRows(report).map(
    ([metric, value]) => `| ${metric} | ${value} |`
  );

  return ["| Metric | Result |", "| --- | ---: |", ...rows].join("\n");
}

export function renderBenchmarkSummaryMarkdown(report: BenchmarkRunReport) {
  return [
    "# Syntheci Benchmark Summary",
    "",
    "> All metrics below are objective, reproducible measurements from the seeded demo workspace and are safe to quote publicly.",
    "",
    `- Dataset: ${report.datasetName}`,
    `- Run timestamp: ${report.runAt}`,
    `- System: ${report.systemId}`,
    `- Chat model: ${report.models.chatModel}`,
    `- Embedding model: ${report.models.embeddingModel}`,
    `- Seed source: ${report.seedSource}`,
    `- Evaluated cases: ${report.totalCaseCount}`,
    "",
    renderQuoteSafeSummaryTable(report)
  ].join("\n");
}

export function renderBenchmarkReportMarkdown(report: BenchmarkRunReport) {
  const suiteSections = Object.entries(report.suites).map(renderSuiteSection).join("\n\n");

  return [
    "# Syntheci Benchmark Report",
    "",
    `Generated at ${report.runAt} against dataset "${report.datasetName}".`,
    "",
    "## Run Metadata",
    "",
    `- System: ${report.systemId}`,
    `- Seed source: ${report.seedSource}`,
    `- Objective metrics only: ${report.objectiveMetricsOnly ? "Yes" : "No"}`,
    `- Chat model: ${report.models.chatModel}`,
    `- Embedding model: ${report.models.embeddingModel}`,
    `- Total evaluated cases: ${report.totalCaseCount}`,
    "",
    "## Quote-safe Summary",
    "",
    "> The summary table below is the README and pitch-safe subset of this run.",
    "",
    renderQuoteSafeSummaryTable(report),
    "",
    "## Suite Details",
    "",
    suiteSections
  ].join("\n");
}

export function buildBenchmarkOutputDir(baseDir: string, runAt: string) {
  const safeTimestamp = runAt.replace(/[:.]/g, "-");
  return resolve(baseDir, safeTimestamp);
}

export async function writeBenchmarkArtifacts(
  report: BenchmarkRunReport,
  input?: { baseDir?: string }
): Promise<BenchmarkArtifactPaths> {
  const workspaceCwd = process.env.INIT_CWD ?? process.cwd();
  const baseDir = input?.baseDir ?? resolve(workspaceCwd, "benchmark-reports");
  const outputDir = buildBenchmarkOutputDir(baseDir, report.runAt);
  const jsonPath = resolve(outputDir, "benchmark-report.json");
  const markdownPath = resolve(outputDir, "benchmark-report.md");
  const summaryPath = resolve(outputDir, "benchmark-summary.md");

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderBenchmarkReportMarkdown(report)}\n`, "utf8");
  await writeFile(summaryPath, `${renderBenchmarkSummaryMarkdown(report)}\n`, "utf8");

  return {
    outputDir,
    jsonPath,
    markdownPath,
    summaryPath
  };
}
