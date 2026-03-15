import type { BriefingItemType, SourceType, TriageLabel } from "@syntheci/shared";

import type {
  BenchmarkMetric,
  BenchmarkSupportRef,
  LatencyStats,
  RetrievalCase
} from "./types";

export function supportRefKey(ref: BenchmarkSupportRef) {
  return `${ref.sourceType}:${ref.key}`;
}

export function percentile(values: number[], quantile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return sorted[index] ?? 0;
}

export function buildLatencyStats(samplesMs: number[]): LatencyStats {
  const values = samplesMs.filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length === 0) {
    return {
      samplesMs: [],
      minMs: 0,
      maxMs: 0,
      medianMs: 0,
      p95Ms: 0
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  return {
    samplesMs: sorted,
    minMs: sorted[0] ?? 0,
    maxMs: sorted.at(-1) ?? 0,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95)
  };
}

export function ratioMetric(
  label: string,
  numerator: number,
  denominator: number,
  description?: string
): BenchmarkMetric {
  return {
    label,
    value: denominator === 0 ? 0 : numerator / denominator,
    format: "percent",
    description,
    numerator,
    denominator
  };
}

export function countMetric(label: string, value: number, description?: string): BenchmarkMetric {
  return {
    label,
    value,
    format: "count",
    description,
    numerator: value
  };
}

export function latencyMetric(label: string, value: number, description?: string): BenchmarkMetric {
  return {
    label,
    value,
    format: "ms",
    description
  };
}

export function textMetric(label: string, value: string, description?: string): BenchmarkMetric {
  return {
    label,
    value,
    format: "text",
    description
  };
}

export function computeFirstRelevantRank(
  retrievedRefs: string[],
  relevantRefs: Set<string>
) {
  const index = retrievedRefs.findIndex((ref) => relevantRefs.has(ref));
  return index === -1 ? null : index + 1;
}

export function computeRecallAtK(
  retrievedRefs: string[],
  relevantRefs: Set<string>,
  k: number
) {
  if (relevantRefs.size === 0) {
    return 0;
  }

  const topK = new Set(retrievedRefs.slice(0, k));
  let hits = 0;
  for (const ref of relevantRefs) {
    if (topK.has(ref)) {
      hits += 1;
    }
  }

  return hits / relevantRefs.size;
}

export function computeAllRequiredAtK(
  retrievedRefs: string[],
  requiredRefs: Set<string>,
  k: number
) {
  if (requiredRefs.size === 0) {
    return false;
  }

  const topK = new Set(retrievedRefs.slice(0, k));
  return [...requiredRefs].every((ref) => topK.has(ref));
}

export function computeMrr(retrievedRefs: string[], relevantRefs: Set<string>) {
  const rank = computeFirstRelevantRank(retrievedRefs, relevantRefs);
  return rank === null ? 0 : 1 / rank;
}

export function normalizeSupportSet(refs: BenchmarkSupportRef[]) {
  return new Set(refs.map(supportRefKey));
}

export function aggregateSourceTypeHits(
  retrievedRefs: string[],
  relevantRefs: Set<string>
): Record<SourceType, number> {
  const counts: Record<SourceType, number> = {
    gmail: 0,
    note: 0,
    upload: 0,
    link: 0,
    contact: 0
  };

  for (const ref of retrievedRefs) {
    if (!relevantRefs.has(ref)) {
      continue;
    }

    const [sourceType] = ref.split(":");
    if (sourceType in counts) {
      counts[sourceType as SourceType] += 1;
    }
  }

  return counts;
}

export function scoreCitationSet(citedRefs: string[], relevantRefs: Set<string>) {
  const supportedCount = citedRefs.filter((ref) => relevantRefs.has(ref)).length;
  const unsupportedCount = citedRefs.length - supportedCount;

  return {
    citedCount: citedRefs.length,
    supportedCount,
    unsupportedCount,
    precision: citedRefs.length === 0 ? 0 : supportedCount / citedRefs.length,
    covered: supportedCount > 0
  };
}

export function normalizeBriefingItemKey(input: {
  type: BriefingItemType;
  refs: BenchmarkSupportRef[];
}) {
  const refPart = [...new Set(input.refs.map(supportRefKey))].sort().join("|");
  return `${input.type}:${refPart}`;
}

export function scoreBriefingItems(
  generatedItems: Array<{ type: BriefingItemType; refs: BenchmarkSupportRef[] }>,
  expectedItems: Array<{ type: BriefingItemType; refs: BenchmarkSupportRef[] }>
) {
  const generatedKeys = new Set(generatedItems.map(normalizeBriefingItemKey));
  const expectedKeys = new Set(expectedItems.map(normalizeBriefingItemKey));

  let matched = 0;
  for (const key of generatedKeys) {
    if (expectedKeys.has(key)) {
      matched += 1;
    }
  }

  return {
    matched,
    generatedCount: generatedKeys.size,
    expectedCount: expectedKeys.size,
    precision: generatedKeys.size === 0 ? 0 : matched / generatedKeys.size,
    recall: expectedKeys.size === 0 ? 0 : matched / expectedKeys.size,
    unsupportedCount: Math.max(0, generatedKeys.size - matched)
  };
}

export function buildConfusionMatrix(labels: TriageLabel[], pairs: Array<{ expected: TriageLabel; actual: TriageLabel }>) {
  const matrix: Record<TriageLabel, Record<TriageLabel, number>> = Object.fromEntries(
    labels.map((expected) => [
      expected,
      Object.fromEntries(labels.map((actual) => [actual, 0]))
    ])
  ) as Record<TriageLabel, Record<TriageLabel, number>>;

  for (const pair of pairs) {
    matrix[pair.expected][pair.actual] += 1;
  }

  return matrix;
}

export function scoreClassificationMetrics(
  labels: TriageLabel[],
  pairs: Array<{ expected: TriageLabel; actual: TriageLabel }>
) {
  const confusion = buildConfusionMatrix(labels, pairs);
  const metrics: Record<string, number> = {};

  for (const label of labels) {
    const truePositive = confusion[label][label];
    const predictedCount = labels.reduce((count, candidate) => count + confusion[candidate][label], 0);
    const actualCount = labels.reduce((count, candidate) => count + confusion[label][candidate], 0);

    metrics[`${label}Precision`] = predictedCount === 0 ? 0 : truePositive / predictedCount;
    metrics[`${label}Recall`] = actualCount === 0 ? 0 : truePositive / actualCount;
  }

  return {
    confusion,
    metrics
  };
}

export function scoreMeetingAttendees(actual: string[], expected: string[]) {
  const actualSet = new Set(actual.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const expectedSet = new Set(expected.map((value) => value.trim().toLowerCase()).filter(Boolean));

  if (actualSet.size !== expectedSet.size) {
    return false;
  }

  return [...expectedSet].every((value) => actualSet.has(value));
}

export function scoreRetrievalCaseAtK(
  retrievalCase: RetrievalCase,
  retrievedRefs: string[],
  k: number
) {
  const relevantRefs = normalizeSupportSet(retrievalCase.supportRefs);
  const requiredRefs = normalizeSupportSet(
    retrievalCase.minimumEvidenceRefs ?? retrievalCase.supportRefs
  );

  return {
    recall: computeRecallAtK(retrievedRefs, relevantRefs, k),
    allRequired: computeAllRequiredAtK(retrievedRefs, requiredRefs, k)
  };
}
