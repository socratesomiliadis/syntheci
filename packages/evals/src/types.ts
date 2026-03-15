import type { BriefingItemType, SourceType, TriageLabel } from "@syntheci/shared";

export type BenchmarkTaskTag =
  | "single_doc"
  | "multi_doc"
  | "contact"
  | "email"
  | "note"
  | "link"
  | "upload"
  | "briefing"
  | "scheduling";

export interface BenchmarkSupportRef {
  sourceType: SourceType;
  key: string;
}

export interface BenchmarkCaseBase {
  id: string;
  prompt: string;
  supportRefs: BenchmarkSupportRef[];
  minimumEvidenceRefs?: BenchmarkSupportRef[];
  tags: readonly BenchmarkTaskTag[];
}

export interface RetrievalCase extends BenchmarkCaseBase {
  type: "retrieval";
}

export interface StructuredAnswerOption {
  key: string;
  label: string;
}

export interface StructuredAnswerCase extends BenchmarkCaseBase {
  expectedAnswerKey: string;
  options: StructuredAnswerOption[];
}

export interface ChatConclusionCase extends StructuredAnswerCase {
  type: "chat_conclusion";
}

export interface TriageCase {
  id: string;
  messageKey: string;
  expectedLabel: TriageLabel;
  tags: readonly BenchmarkTaskTag[];
}

export interface MeetingExtractionCase {
  id: string;
  messageKey: string;
  expected: {
    hasSchedulingIntent: boolean;
    title: string | null;
    startsAt: string | null;
    endsAt: string | null;
    attendees: string[];
  };
  tags: readonly BenchmarkTaskTag[];
}

export interface BriefingCase {
  id: string;
  briefingDate: string;
  referenceTimeIso: string;
  expectedItems: Array<{
    type: BriefingItemType;
    refs: BenchmarkSupportRef[];
  }>;
  expectedPriorityRefs: BenchmarkSupportRef[];
}

export interface LatencyStats {
  samplesMs: number[];
  minMs: number;
  maxMs: number;
  medianMs: number;
  p95Ms: number;
}

export interface BenchmarkMetric {
  label: string;
  value: number | string;
  format?: "percent" | "ms" | "count" | "text";
  description?: string;
  numerator?: number;
  denominator?: number;
}

export interface BenchmarkSuiteResult<TCaseResult = Record<string, unknown>> {
  suite: string;
  caseCount: number;
  passCount: number;
  failCount: number;
  metrics: Record<string, BenchmarkMetric>;
  quoteSafeMetricKeys: string[];
  latency: LatencyStats;
  cases: TCaseResult[];
}

export interface BenchmarkRunReport {
  datasetName: string;
  runAt: string;
  systemId: string;
  models: {
    chatModel: string;
    embeddingModel: string;
  };
  seedSource: string;
  objectiveMetricsOnly: true;
  totalCaseCount: number;
  suites: Record<string, BenchmarkSuiteResult>;
  summary: {
    retrievalRecallAt5: number;
    retrievalMrr: number;
    multiDocumentAccuracy: number;
    singleDocumentAccuracy: number;
    citationPrecision: number;
    citationCoverage: number;
    triageAccuracy: number;
    briefingItemRecall: number;
    briefingPriorityCoverage: number;
    meetingIntentAccuracy: number;
    meetingTimeAccuracy: number;
  };
}

export interface SeededMessageRecord {
  id: string;
  key: string;
  sourceId: string;
  sourceType: SourceType;
  subject: string | null;
  textBody: string;
  senderEmail: string | null;
  deepLink: string | null;
  receivedAt: Date;
}

export interface SeededDocumentRecord {
  id: string;
  key: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  rawText: string;
  externalUrl: string | null;
}

export interface SeededWorkspaceSnapshot {
  workspaceId: string;
  sourceIdsByType: Partial<Record<SourceType, string>>;
  messagesByKey: Record<string, SeededMessageRecord>;
  documentsByKey: Record<string, SeededDocumentRecord>;
}
