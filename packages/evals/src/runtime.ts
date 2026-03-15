import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

import { generateObject } from "ai";
import { z } from "zod";

import {
  answerWithCitations,
  buildGroundedChatSystemPrompt,
  chatModel,
  chatModelVersion,
  classifyMessageTriage,
  embeddingModelVersion,
  extractMeetingProposal,
  generateDailyBriefing
} from "@syntheci/ai";
import {
  db,
  documents as documentsTable,
  eq,
  messages as messagesTable,
  pingDatabase,
  sources as sourcesTable
} from "@syntheci/db";
import type { BriefingItem, ChatCitation, SourceType, TriageLabel } from "@syntheci/shared";

import type { retrieveContextChunks as retrieveContextChunksType } from "../../../apps/web/lib/retrieval.ts";
import type { importNextDemoSyncBatch as importNextDemoSyncBatchType } from "../../../apps/web/lib/demo.ts";
import type { BootstrapDemoSeedResult } from "../../../apps/worker/src/bootstrap-demo.ts";
import type { buildBriefingInput as buildBriefingInputType } from "../../../apps/worker/src/services/briefing.ts";
import type { ensureBucketExists as ensureBucketExistsType } from "../../../apps/worker/src/services/storage.ts";

import {
  BENCHMARK_DATASET_NAME,
  briefingCase,
  chatConclusionCases,
  meetingExtractionCases,
  retrievalCases,
  triageCases
} from "./cases";
import {
  aggregateSourceTypeHits,
  buildLatencyStats,
  computeMrr,
  countMetric,
  latencyMetric,
  normalizeSupportSet,
  percentile,
  ratioMetric,
  scoreBriefingItems,
  scoreCitationSet,
  scoreClassificationMetrics,
  scoreMeetingAttendees,
  scoreRetrievalCaseAtK,
  supportRefKey,
  textMetric
} from "./metrics";
import type {
  BenchmarkRunReport,
  BenchmarkSuiteResult,
  BenchmarkSupportRef,
  ChatConclusionCase,
  SeededDocumentRecord,
  SeededMessageRecord,
  SeededWorkspaceSnapshot
} from "./types";

const SOURCE_TYPE_ORDER: SourceType[] = ["gmail", "note", "upload", "link", "contact"];
const TRIAGE_LABELS: TriageLabel[] = [
  "urgent",
  "needs_reply",
  "follow_up",
  "scheduling",
  "informational"
];
const require = createRequire(import.meta.url);
const { retrieveContextChunks } = require("../../../apps/web/lib/retrieval.ts") as {
  retrieveContextChunks: typeof retrieveContextChunksType;
};
const { importNextDemoSyncBatch } = require("../../../apps/web/lib/demo.ts") as {
  importNextDemoSyncBatch: typeof importNextDemoSyncBatchType;
};
const { bootstrapDemoWorkspace } = require("../../../apps/worker/src/bootstrap-demo.ts") as {
  bootstrapDemoWorkspace: () => Promise<BootstrapDemoSeedResult | null>;
};
const { ensureBucketExists } = require("../../../apps/worker/src/services/storage.ts") as {
  ensureBucketExists: typeof ensureBucketExistsType;
};
const { buildBriefingInput } = require("../../../apps/worker/src/services/briefing.ts") as {
  buildBriefingInput: typeof buildBriefingInputType;
};

function resolveEnv(name: string) {
  const value = process.env[name];
  if (!value || value === "replace-me") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function safeJsonRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function buildMessageLookup(snapshot: SeededWorkspaceSnapshot) {
  return new Map(
    Object.values(snapshot.messagesByKey).map((message) => [message.id, message] as const)
  );
}

function buildDocumentLookup(snapshot: SeededWorkspaceSnapshot) {
  return new Map(
    Object.values(snapshot.documentsByKey).map((document) => [document.id, document] as const)
  );
}

function resolveBenchmarkSupportRef(
  snapshot: SeededWorkspaceSnapshot,
  input: { sourceType: string; messageOrDocId: string }
) {
  const message = buildMessageLookup(snapshot).get(input.messageOrDocId);
  if (message) {
    return {
      sourceType: message.sourceType,
      key: message.key
    } satisfies BenchmarkSupportRef;
  }

  const document = buildDocumentLookup(snapshot).get(input.messageOrDocId);
  if (document) {
    return {
      sourceType: document.sourceType,
      key: document.key
    } satisfies BenchmarkSupportRef;
  }

  return {
    sourceType: input.sourceType as BenchmarkSupportRef["sourceType"],
    key: `unmapped:${input.messageOrDocId}`
  } satisfies BenchmarkSupportRef;
}

function toBenchmarkSupportRefs(
  snapshot: SeededWorkspaceSnapshot,
  items: Array<{ sourceType: string; messageOrDocId: string }>
) {
  return items.map((item) => resolveBenchmarkSupportRef(snapshot, item));
}

function toRetrievedRefKeys(
  snapshot: SeededWorkspaceSnapshot,
  items: Array<{ sourceType: string; messageOrDocId: string }>
) {
  return toBenchmarkSupportRefs(snapshot, items).map(supportRefKey);
}

function buildEvidence(chunks: Array<{ sourceType: string; content: string }>) {
  const evidence = chunks
    .map((chunk, index) => `[${index + 1}] (${chunk.sourceType}) ${chunk.content}`)
    .join("\n\n");

  return evidence || "No evidence provided.";
}

function convertBriefingItemsToBenchmarkRefs(
  snapshot: SeededWorkspaceSnapshot,
  items: BriefingItem[]
) {
  return items.map((item) => ({
    type: item.type,
    refs: toBenchmarkSupportRefs(
      snapshot,
      item.sourceRefs.map((ref) => ({
        sourceType: ref.sourceType,
        messageOrDocId: ref.messageOrDocId
      }))
    ).filter((ref) => !ref.key.startsWith("unmapped:"))
  }));
}

function normalizeIsoInstant(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

async function timeAsync<T>(callback: () => Promise<T>) {
  const startedAt = performance.now();
  const value = await callback();
  const durationMs = performance.now() - startedAt;

  return { value, durationMs };
}

async function runStructuredChatCase(
  snapshot: SeededWorkspaceSnapshot,
  benchmarkCase: ChatConclusionCase
) {
  const retrieval = await timeAsync(() =>
    retrieveContextChunks({
      workspaceId: snapshot.workspaceId,
      question: benchmarkCase.prompt
    })
  );

  const evidence = buildEvidence(retrieval.value);
  const options = benchmarkCase.options.map((option) => `- ${option.key}: ${option.label}`).join("\n");
  const validOptions = new Set(benchmarkCase.options.map((option) => option.key));

  const generation = await timeAsync(() =>
    generateObject({
      model: chatModel,
      schema: z.object({
        answerKey: z
          .string()
          .refine((value) => validOptions.has(value), "answerKey must match a provided option")
      }),
      system: buildGroundedChatSystemPrompt(evidence),
      prompt: `Question: ${benchmarkCase.prompt}\n\nChoose exactly one option key.\nOptions:\n${options}`
    })
  );

  return {
    id: benchmarkCase.id,
    expectedAnswerKey: benchmarkCase.expectedAnswerKey,
    actualAnswerKey: generation.value.object.answerKey,
    passed: generation.value.object.answerKey === benchmarkCase.expectedAnswerKey,
    retrievedRefs: toRetrievedRefKeys(snapshot, retrieval.value),
    relevantRefs: [...normalizeSupportSet(benchmarkCase.supportRefs)],
    retrievalLatencyMs: retrieval.durationMs,
    generationLatencyMs: generation.durationMs,
    totalLatencyMs: retrieval.durationMs + generation.durationMs,
    tags: benchmarkCase.tags
  };
}

export async function verifyBenchmarkEnvironment() {
  await pingDatabase();

  resolveEnv("GROQ_API_KEY");
  resolveEnv("GOOGLE_GENERATIVE_AI_API_KEY");
  resolveEnv("BETTER_AUTH_SECRET");
  resolveEnv("DATABASE_URL");
  await ensureBucketExists();
}

export async function reseedBenchmarkWorkspace() {
  const result = await bootstrapDemoWorkspace();
  if (!result) {
    throw new Error("Demo bootstrap is disabled.");
  }

  for (;;) {
    const batchResult = await importNextDemoSyncBatch({
      workspaceId: result.workspaceId,
      connectedAccountId: result.connectedAccountId
    });

    if (!batchResult.batchId) {
      break;
    }
  }

  return result;
}

export async function loadSeededWorkspaceSnapshot(
  seedResult: BootstrapDemoSeedResult
): Promise<SeededWorkspaceSnapshot> {
  const [sources, messages, documents] = await Promise.all([
    db.query.sources.findMany({
      where: eq(sourcesTable.workspaceId, seedResult.workspaceId)
    }),
    db.query.messages.findMany({
      where: eq(messagesTable.workspaceId, seedResult.workspaceId)
    }),
    db.query.documents.findMany({
      where: eq(documentsTable.workspaceId, seedResult.workspaceId)
    })
  ]);

  const sourceTypeById = new Map(sources.map((source) => [source.id, source.type] as const));
  const sourceIdsByType = Object.fromEntries(
    sources.map((source) => [source.type, source.id] as const)
  );

  const messagesByKey = Object.fromEntries(
    messages.flatMap((message) => {
      const rawPayload = safeJsonRecord(message.rawPayload);
      const fixtureKey = rawPayload?.fixtureKey;
      if (typeof fixtureKey !== "string") {
        return [];
      }

      const sourceType = sourceTypeById.get(message.sourceId);
      if (!sourceType) {
        return [];
      }

      const record: SeededMessageRecord = {
        id: message.id,
        key: fixtureKey,
        sourceId: message.sourceId,
        sourceType,
        subject: message.subject,
        textBody: message.textBody,
        senderEmail: message.senderEmail,
        deepLink: message.deepLink,
        receivedAt: message.receivedAt
      };

      return [[fixtureKey, record] as const];
    })
  );

  const documentsByKey = Object.fromEntries(
    documents.flatMap((document) => {
      const metadata = safeJsonRecord(document.metadata);
      const fixtureKey = metadata?.key;
      if (typeof fixtureKey !== "string") {
        return [];
      }

      const sourceType = sourceTypeById.get(document.sourceId);
      if (!sourceType) {
        return [];
      }

      const record: SeededDocumentRecord = {
        id: document.id,
        key: fixtureKey,
        sourceId: document.sourceId,
        sourceType,
        title: document.title,
        rawText: document.rawText,
        externalUrl: document.externalUrl
      };

      return [[fixtureKey, record] as const];
    })
  );

  return {
    workspaceId: seedResult.workspaceId,
    sourceIdsByType,
    messagesByKey,
    documentsByKey
  };
}

export async function runBenchmarkSuites(): Promise<BenchmarkRunReport> {
  await verifyBenchmarkEnvironment();

  const seedResult = await reseedBenchmarkWorkspace();
  const snapshot = await loadSeededWorkspaceSnapshot(seedResult);

  const retrievalLatencySamples: number[] = [];
  const retrievalCaseResults = [];

  for (const benchmarkCase of retrievalCases) {
    const retrieval = await timeAsync(() =>
      retrieveContextChunks({
        workspaceId: snapshot.workspaceId,
        question: benchmarkCase.prompt
      })
    );

    retrievalLatencySamples.push(retrieval.durationMs);

    const retrievedRefs = toRetrievedRefKeys(snapshot, retrieval.value);
    const relevantRefs = normalizeSupportSet(benchmarkCase.supportRefs);
    const top1 = scoreRetrievalCaseAtK(benchmarkCase, retrievedRefs, 1);
    const top3 = scoreRetrievalCaseAtK(benchmarkCase, retrievedRefs, 3);
    const top5 = scoreRetrievalCaseAtK(benchmarkCase, retrievedRefs, 5);

    retrievalCaseResults.push({
      id: benchmarkCase.id,
      prompt: benchmarkCase.prompt,
      retrievedRefs,
      supportRefs: [...relevantRefs],
      minimumEvidenceRefs: [
        ...normalizeSupportSet(benchmarkCase.minimumEvidenceRefs ?? benchmarkCase.supportRefs)
      ],
      recallAt1: top1.recall,
      recallAt3: top3.recall,
      recallAt5: top5.recall,
      mrr: computeMrr(retrievedRefs, relevantRefs),
      allRequiredAt5: top5.allRequired,
      tags: benchmarkCase.tags,
      latencyMs: retrieval.durationMs
    });
  }

  const retrievalMetricsSummary = retrievalCaseResults.reduce(
    (summary, result) => {
      const benchmarkCase = retrievalCases.find((candidate) => candidate.id === result.id);
      if (!benchmarkCase) {
        return summary;
      }

      summary.recallAt1 += result.recallAt1;
      summary.recallAt3 += result.recallAt3;
      summary.recallAt5 += result.recallAt5;
      summary.mrr += result.mrr;

      if (benchmarkCase.tags.includes("multi_doc")) {
        summary.multiDocCount += 1;
        if (result.allRequiredAt5) {
          summary.multiDocAllRequiredAt5 += 1;
        }
      }

      const relevantRefs = normalizeSupportSet(benchmarkCase.supportRefs);
      const typeHits = aggregateSourceTypeHits(result.retrievedRefs.slice(0, 5), relevantRefs);
      for (const sourceType of SOURCE_TYPE_ORDER) {
        summary.sourceTypeHits[sourceType] += typeHits[sourceType];
      }

      return summary;
    },
    {
      recallAt1: 0,
      recallAt3: 0,
      recallAt5: 0,
      mrr: 0,
      multiDocCount: 0,
      multiDocAllRequiredAt5: 0,
      sourceTypeHits: {
        gmail: 0,
        note: 0,
        upload: 0,
        link: 0,
        contact: 0
      } as Record<SourceType, number>
    }
  );

  const totalRelevantHitsAt5 = SOURCE_TYPE_ORDER.reduce(
    (count, sourceType) => count + retrievalMetricsSummary.sourceTypeHits[sourceType],
    0
  );

  const retrievalSuite: BenchmarkSuiteResult = {
    suite: "retrieval",
    caseCount: retrievalCases.length,
    passCount: retrievalCaseResults.filter((result) => result.allRequiredAt5).length,
    failCount: retrievalCaseResults.filter((result) => !result.allRequiredAt5).length,
    metrics: {
      recallAt1: ratioMetric("Recall@1", retrievalMetricsSummary.recallAt1, retrievalCases.length),
      recallAt3: ratioMetric("Recall@3", retrievalMetricsSummary.recallAt3, retrievalCases.length),
      recallAt5: ratioMetric("Recall@5", retrievalMetricsSummary.recallAt5, retrievalCases.length),
      mrr: ratioMetric("MRR", retrievalMetricsSummary.mrr, retrievalCases.length),
      allRequiredAt5: ratioMetric(
        "All required sources in top 5",
        retrievalMetricsSummary.multiDocAllRequiredAt5,
        retrievalMetricsSummary.multiDocCount
      ),
      gmailHitShareAt5: ratioMetric(
        "Relevant Gmail hit share@5",
        retrievalMetricsSummary.sourceTypeHits.gmail,
        totalRelevantHitsAt5
      ),
      noteHitShareAt5: ratioMetric(
        "Relevant note hit share@5",
        retrievalMetricsSummary.sourceTypeHits.note,
        totalRelevantHitsAt5
      ),
      uploadHitShareAt5: ratioMetric(
        "Relevant upload hit share@5",
        retrievalMetricsSummary.sourceTypeHits.upload,
        totalRelevantHitsAt5
      ),
      linkHitShareAt5: ratioMetric(
        "Relevant link hit share@5",
        retrievalMetricsSummary.sourceTypeHits.link,
        totalRelevantHitsAt5
      ),
      contactHitShareAt5: ratioMetric(
        "Relevant contact hit share@5",
        retrievalMetricsSummary.sourceTypeHits.contact,
        totalRelevantHitsAt5
      ),
      relevantHitsAt5: countMetric("Relevant hits in top 5", totalRelevantHitsAt5),
      latencyMedianMs: latencyMetric(
        "Median retrieval latency",
        percentile(retrievalLatencySamples, 0.5)
      ),
      latencyP95Ms: latencyMetric("P95 retrieval latency", percentile(retrievalLatencySamples, 0.95))
    },
    quoteSafeMetricKeys: [
      "recallAt1",
      "recallAt3",
      "recallAt5",
      "mrr",
      "allRequiredAt5",
      "gmailHitShareAt5",
      "noteHitShareAt5",
      "uploadHitShareAt5",
      "linkHitShareAt5",
      "contactHitShareAt5",
      "relevantHitsAt5",
      "latencyMedianMs",
      "latencyP95Ms"
    ],
    latency: buildLatencyStats(retrievalLatencySamples),
    cases: retrievalCaseResults
  };

  const citationLatencySamples: number[] = [];
  const citationCaseResults = [];

  for (const benchmarkCase of retrievalCases) {
    const timed = await timeAsync(async () => {
      const chunks = await retrieveContextChunks({
        workspaceId: snapshot.workspaceId,
        question: benchmarkCase.prompt
      });
      const answer = await answerWithCitations({
        question: benchmarkCase.prompt,
        chunks
      });

      return {
        chunks,
        answer
      };
    });

    citationLatencySamples.push(timed.durationMs);

    const citedRefs = toRetrievedRefKeys(
      snapshot,
      timed.value.answer.citations.map((citation: ChatCitation) => ({
        sourceType: citation.sourceType,
        messageOrDocId: citation.messageOrDocId
      }))
    );
    const scoring = scoreCitationSet(citedRefs, normalizeSupportSet(benchmarkCase.supportRefs));

    citationCaseResults.push({
      id: benchmarkCase.id,
      prompt: benchmarkCase.prompt,
      citations: citedRefs,
      supportedCitationCount: scoring.supportedCount,
      unsupportedCitationCount: scoring.unsupportedCount,
      citationPrecision: scoring.precision,
      covered: scoring.covered,
      latencyMs: timed.durationMs
    });
  }

  const citationTotals = citationCaseResults.reduce(
    (summary, result) => {
      summary.supported += result.supportedCitationCount;
      summary.unsupported += result.unsupportedCitationCount;
      summary.covered += result.covered ? 1 : 0;
      return summary;
    },
    { supported: 0, unsupported: 0, covered: 0 }
  );
  const totalCitations = citationTotals.supported + citationTotals.unsupported;

  const citationSuite: BenchmarkSuiteResult = {
    suite: "citation_grounding",
    caseCount: citationCaseResults.length,
    passCount: citationCaseResults.filter((result) => result.covered).length,
    failCount: citationCaseResults.filter((result) => !result.covered).length,
    metrics: {
      citationPrecision: ratioMetric("Citation precision", citationTotals.supported, totalCitations),
      citationCoverage: ratioMetric(
        "Citation coverage",
        citationTotals.covered,
        citationCaseResults.length
      ),
      unsupportedCitationRate: ratioMetric(
        "Unsupported citation rate",
        citationTotals.unsupported,
        totalCitations
      ),
      latencyMedianMs: latencyMetric(
        "Median citation answer latency",
        percentile(citationLatencySamples, 0.5)
      ),
      latencyP95Ms: latencyMetric(
        "P95 citation answer latency",
        percentile(citationLatencySamples, 0.95)
      )
    },
    quoteSafeMetricKeys: [
      "citationPrecision",
      "citationCoverage",
      "unsupportedCitationRate",
      "latencyMedianMs",
      "latencyP95Ms"
    ],
    latency: buildLatencyStats(citationLatencySamples),
    cases: citationCaseResults
  };

  const chatConclusionResults = [];
  for (const benchmarkCase of chatConclusionCases) {
    chatConclusionResults.push(await runStructuredChatCase(snapshot, benchmarkCase));
  }

  const chatLatencies = chatConclusionResults.map((result) => result.totalLatencyMs);
  const multiDocumentChatCaseCount = chatConclusionResults.filter((result) =>
    result.tags.includes("multi_doc")
  ).length;
  const singleDocumentChatCaseCount = chatConclusionResults.filter((result) =>
    result.tags.includes("single_doc")
  ).length;

  const chatSuite: BenchmarkSuiteResult = {
    suite: "chat_conclusions",
    caseCount: chatConclusionCases.length,
    passCount: chatConclusionResults.filter((result) => result.passed).length,
    failCount: chatConclusionResults.filter((result) => !result.passed).length,
    metrics: {
      exactMatchAccuracy: ratioMetric(
        "Exact match accuracy",
        chatConclusionResults.filter((result) => result.passed).length,
        chatConclusionCases.length
      ),
      multiDocumentAccuracy: ratioMetric(
        "Multi-document exact match accuracy",
        chatConclusionResults.filter(
          (result) => result.passed && result.tags.includes("multi_doc")
        ).length,
        multiDocumentChatCaseCount
      ),
      singleDocumentAccuracy: ratioMetric(
        "Single-document exact match accuracy",
        chatConclusionResults.filter(
          (result) => result.passed && result.tags.includes("single_doc")
        ).length,
        singleDocumentChatCaseCount
      ),
      latencyMedianMs: latencyMetric("Median structured chat latency", percentile(chatLatencies, 0.5)),
      latencyP95Ms: latencyMetric("P95 structured chat latency", percentile(chatLatencies, 0.95))
    },
    quoteSafeMetricKeys: [
      "exactMatchAccuracy",
      "multiDocumentAccuracy",
      "singleDocumentAccuracy",
      "latencyMedianMs",
      "latencyP95Ms"
    ],
    latency: buildLatencyStats(chatLatencies),
    cases: chatConclusionResults
  };

  const triageResults = [];
  for (const benchmarkCase of triageCases) {
    const message = snapshot.messagesByKey[benchmarkCase.messageKey];
    if (!message) {
      throw new Error(`Missing seeded message for triage case: ${benchmarkCase.messageKey}`);
    }

    const timed = await timeAsync(() =>
      classifyMessageTriage({
        subject: message.subject,
        body: message.textBody,
        sender: message.senderEmail
      })
    );

    triageResults.push({
      id: benchmarkCase.id,
      messageKey: benchmarkCase.messageKey,
      expected: benchmarkCase.expectedLabel,
      actual: timed.value.label,
      passed: timed.value.label === benchmarkCase.expectedLabel,
      latencyMs: timed.durationMs
    });
  }

  const triageLatencies = triageResults.map((result) => result.latencyMs);
  const triagePairs = triageResults.map((result) => ({
    expected: result.expected,
    actual: result.actual as TriageLabel
  }));
  const triageStats = scoreClassificationMetrics(TRIAGE_LABELS, triagePairs);
  const triageMetricEntries: Array<[string, ReturnType<typeof ratioMetric>]> = Object.entries(
    triageStats.metrics
  ).map(([key, value]) => [key, ratioMetric(key, value, 1)]);

  const triageSuite: BenchmarkSuiteResult = {
    suite: "triage",
    caseCount: triageCases.length,
    passCount: triageResults.filter((result) => result.passed).length,
    failCount: triageResults.filter((result) => !result.passed).length,
    metrics: {
      accuracy: ratioMetric(
        "Accuracy",
        triageResults.filter((result) => result.passed).length,
        triageCases.length
      ),
      ...Object.fromEntries(triageMetricEntries),
      confusionMatrix: textMetric("Confusion matrix", JSON.stringify(triageStats.confusion)),
      latencyMedianMs: latencyMetric("Median triage latency", percentile(triageLatencies, 0.5)),
      latencyP95Ms: latencyMetric("P95 triage latency", percentile(triageLatencies, 0.95))
    },
    quoteSafeMetricKeys: [
      "accuracy",
      ...triageMetricEntries.map(([key]) => key),
      "latencyMedianMs",
      "latencyP95Ms"
    ],
    latency: buildLatencyStats(triageLatencies),
    cases: triageResults
  };

  const briefingTimed = await timeAsync(async () => {
    const input = await buildBriefingInput({
      workspaceId: snapshot.workspaceId,
      referenceTime: new Date(briefingCase.referenceTimeIso)
    });
    return generateDailyBriefing(input);
  });

  const generatedBriefingItems = convertBriefingItemsToBenchmarkRefs(
    snapshot,
    briefingTimed.value.items ?? []
  );
  const briefingScoring = scoreBriefingItems(generatedBriefingItems, briefingCase.expectedItems);
  const generatedBriefingRefSet = new Set(
    generatedBriefingItems.flatMap((item) => item.refs.map(supportRefKey))
  );
  const uniquePriorityRefKeys = [...new Set(briefingCase.expectedPriorityRefs.map(supportRefKey))];
  const priorityRefCount = uniquePriorityRefKeys.length;
  const coveredPriorityRefCount = uniquePriorityRefKeys.filter((refKey) =>
    generatedBriefingRefSet.has(refKey)
  ).length;

  const briefingSuite: BenchmarkSuiteResult = {
    suite: "briefing",
    caseCount: 1,
    passCount: briefingScoring.recall === 1 ? 1 : 0,
    failCount: briefingScoring.recall === 1 ? 0 : 1,
    metrics: {
      itemPrecision: ratioMetric(
        "Briefing item precision",
        briefingScoring.matched,
        briefingScoring.generatedCount
      ),
      itemRecall: ratioMetric(
        "Briefing item recall",
        briefingScoring.matched,
        briefingScoring.expectedCount
      ),
      priorityCoverage: ratioMetric(
        "Priority item coverage",
        coveredPriorityRefCount,
        priorityRefCount
      ),
      unsupportedItemRate: ratioMetric(
        "Unsupported briefing item rate",
        briefingScoring.unsupportedCount,
        briefingScoring.generatedCount
      ),
      latencyMedianMs: latencyMetric("Briefing generation latency", briefingTimed.durationMs)
    },
    quoteSafeMetricKeys: [
      "itemPrecision",
      "itemRecall",
      "priorityCoverage",
      "unsupportedItemRate",
      "latencyMedianMs"
    ],
    latency: buildLatencyStats([briefingTimed.durationMs]),
    cases: [
      {
        id: briefingCase.id,
        generatedItems: generatedBriefingItems,
        expectedItems: briefingCase.expectedItems,
        generatedItemCount: generatedBriefingItems.length,
        expectedItemCount: briefingCase.expectedItems.length,
        matchedItemCount: briefingScoring.matched,
        coveredPriorityRefCount,
        priorityRefCount,
        latencyMs: briefingTimed.durationMs
      }
    ]
  };

  const meetingResults = [];
  for (const benchmarkCase of meetingExtractionCases) {
    const message = snapshot.messagesByKey[benchmarkCase.messageKey];
    if (!message) {
      throw new Error(`Missing seeded message for meeting case: ${benchmarkCase.messageKey}`);
    }

    const timed = await timeAsync(() =>
      extractMeetingProposal({
        subject: message.subject,
        body: message.textBody,
        sender: message.senderEmail,
        timezone: "Europe/Athens",
        referenceTime: message.receivedAt.toISOString()
      })
    );
    const actualStartsAt = normalizeIsoInstant(timed.value.startsAt);
    const actualEndsAt = normalizeIsoInstant(timed.value.endsAt);
    const expectedStartsAt = normalizeIsoInstant(benchmarkCase.expected.startsAt);
    const expectedEndsAt = normalizeIsoInstant(benchmarkCase.expected.endsAt);

    meetingResults.push({
      id: benchmarkCase.id,
      messageKey: benchmarkCase.messageKey,
      expected: benchmarkCase.expected,
      actual: timed.value,
      intentPassed: timed.value.hasSchedulingIntent === benchmarkCase.expected.hasSchedulingIntent,
      startsAtPassed: actualStartsAt === expectedStartsAt,
      endsAtPassed: actualEndsAt === expectedEndsAt,
      attendeesPassed: scoreMeetingAttendees(timed.value.attendees, benchmarkCase.expected.attendees),
      latencyMs: timed.durationMs
    });
  }

  const meetingLatencies = meetingResults.map((result) => result.latencyMs);
  const meetingSuite: BenchmarkSuiteResult = {
    suite: "meeting_extraction",
    caseCount: meetingExtractionCases.length,
    passCount: meetingResults.filter(
      (result) =>
        result.intentPassed && result.startsAtPassed && result.endsAtPassed && result.attendeesPassed
    ).length,
    failCount: meetingResults.filter(
      (result) =>
        !(result.intentPassed && result.startsAtPassed && result.endsAtPassed && result.attendeesPassed)
    ).length,
    metrics: {
      intentAccuracy: ratioMetric(
        "Scheduling intent accuracy",
        meetingResults.filter((result) => result.intentPassed).length,
        meetingResults.length
      ),
      timeExtractionAccuracy: ratioMetric(
        "Time extraction exact-match rate",
        meetingResults.filter((result) => result.startsAtPassed && result.endsAtPassed).length,
        meetingResults.length
      ),
      attendeeAccuracy: ratioMetric(
        "Attendee extraction exact-match rate",
        meetingResults.filter((result) => result.attendeesPassed).length,
        meetingResults.length
      ),
      latencyMedianMs: latencyMetric(
        "Median meeting extraction latency",
        percentile(meetingLatencies, 0.5)
      ),
      latencyP95Ms: latencyMetric("P95 meeting extraction latency", percentile(meetingLatencies, 0.95))
    },
    quoteSafeMetricKeys: [
      "intentAccuracy",
      "timeExtractionAccuracy",
      "attendeeAccuracy",
      "latencyMedianMs",
      "latencyP95Ms"
    ],
    latency: buildLatencyStats(meetingLatencies),
    cases: meetingResults
  };

  const suites: BenchmarkRunReport["suites"] = {
    retrieval: retrievalSuite,
    citation_grounding: citationSuite,
    chat_conclusions: chatSuite,
    triage: triageSuite,
    briefing: briefingSuite,
    meeting_extraction: meetingSuite
  };

  return {
    datasetName: BENCHMARK_DATASET_NAME,
    runAt: new Date().toISOString(),
    systemId: "syntheci-current-stack",
    models: {
      chatModel: chatModelVersion,
      embeddingModel: embeddingModelVersion
    },
    seedSource: "apps/worker/src/bootstrap-demo.ts",
    objectiveMetricsOnly: true,
    totalCaseCount: Object.values(suites).reduce((count, suite) => count + suite.caseCount, 0),
    suites,
    summary: {
      retrievalRecallAt5: retrievalSuite.metrics.recallAt5.value as number,
      retrievalMrr: retrievalSuite.metrics.mrr.value as number,
      multiDocumentAccuracy: chatSuite.metrics.multiDocumentAccuracy.value as number,
      singleDocumentAccuracy: chatSuite.metrics.singleDocumentAccuracy.value as number,
      citationPrecision: citationSuite.metrics.citationPrecision.value as number,
      citationCoverage: citationSuite.metrics.citationCoverage.value as number,
      triageAccuracy: triageSuite.metrics.accuracy.value as number,
      briefingItemRecall: briefingSuite.metrics.itemRecall.value as number,
      briefingPriorityCoverage: briefingSuite.metrics.priorityCoverage.value as number,
      meetingIntentAccuracy: meetingSuite.metrics.intentAccuracy.value as number,
      meetingTimeAccuracy: meetingSuite.metrics.timeExtractionAccuracy.value as number
    }
  };
}
