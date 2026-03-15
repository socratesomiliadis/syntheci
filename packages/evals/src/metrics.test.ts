import { describe, expect, it } from "vitest";

import {
  buildConfusionMatrix,
  buildLatencyStats,
  computeAllRequiredAtK,
  computeMrr,
  computeRecallAtK,
  normalizeBriefingItemKey,
  percentile,
  scoreBriefingItems,
  scoreCitationSet,
  scoreClassificationMetrics,
  scoreMeetingAttendees,
  scoreRetrievalCaseAtK,
  supportRefKey
} from "./metrics";
import type { RetrievalCase } from "./types";

describe("benchmark metrics", () => {
  it("computes retrieval recall and MRR deterministically", () => {
    const relevantRefs = new Set(["gmail:apollo-launch", "link:apollo-brief"]);
    const retrievedRefs = ["note:other", "gmail:apollo-launch", "link:apollo-brief"];

    expect(computeRecallAtK(retrievedRefs, relevantRefs, 1)).toBe(0);
    expect(computeRecallAtK(retrievedRefs, relevantRefs, 2)).toBe(0.5);
    expect(computeRecallAtK(retrievedRefs, relevantRefs, 3)).toBe(1);
    expect(computeAllRequiredAtK(retrievedRefs, relevantRefs, 2)).toBe(false);
    expect(computeAllRequiredAtK(retrievedRefs, relevantRefs, 3)).toBe(true);
    expect(computeMrr(retrievedRefs, relevantRefs)).toBe(0.5);
  });

  it("scores retrieval cases using minimum evidence refs", () => {
    const retrievalCase: RetrievalCase = {
      id: "retrieval-case",
      type: "retrieval",
      prompt: "What matters?",
      supportRefs: [
        { sourceType: "gmail", key: "apollo-launch" },
        { sourceType: "link", key: "apollo-brief" }
      ],
      minimumEvidenceRefs: [{ sourceType: "gmail", key: "apollo-launch" }],
      tags: ["multi_doc", "email", "link"]
    };

    const result = scoreRetrievalCaseAtK(retrievalCase, ["gmail:apollo-launch", "note:other"], 1);

    expect(result.recall).toBe(0.5);
    expect(result.allRequired).toBe(true);
  });

  it("scores citations with precision and coverage", () => {
    const relevantRefs = new Set(["gmail:apollo-launch", "link:apollo-brief"]);
    const result = scoreCitationSet(
      ["gmail:apollo-launch", "note:other", "link:apollo-brief"],
      relevantRefs
    );

    expect(result.supportedCount).toBe(2);
    expect(result.unsupportedCount).toBe(1);
    expect(result.precision).toBeCloseTo(2 / 3);
    expect(result.covered).toBe(true);
  });

  it("normalizes and scores briefing items independent of ref order", () => {
    const expected = [
      {
        type: "priority" as const,
        refs: [
          { sourceType: "gmail" as const, key: "apollo-launch" },
          { sourceType: "link" as const, key: "apollo-brief" }
        ]
      }
    ];
    const generated = [
      {
        type: "priority" as const,
        refs: [
          { sourceType: "link" as const, key: "apollo-brief" },
          { sourceType: "gmail" as const, key: "apollo-launch" }
        ]
      },
      {
        type: "todo" as const,
        refs: [{ sourceType: "note" as const, key: "extra-note" }]
      }
    ];

    expect(normalizeBriefingItemKey(expected[0])).toBe(
      "priority:gmail:apollo-launch|link:apollo-brief"
    );

    const scoring = scoreBriefingItems(generated, expected);
    expect(scoring.matched).toBe(1);
    expect(scoring.generatedCount).toBe(2);
    expect(scoring.expectedCount).toBe(1);
    expect(scoring.precision).toBe(0.5);
    expect(scoring.recall).toBe(1);
    expect(scoring.unsupportedCount).toBe(1);
  });

  it("builds confusion matrices and per-label classification metrics", () => {
    const pairs = [
      { expected: "urgent" as const, actual: "urgent" as const },
      { expected: "urgent" as const, actual: "needs_reply" as const },
      { expected: "needs_reply" as const, actual: "needs_reply" as const },
      { expected: "informational" as const, actual: "informational" as const }
    ];
    const labels = ["urgent", "needs_reply", "informational"] as const;

    const confusion = buildConfusionMatrix(
      labels as unknown as Array<"urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational">,
      pairs as Array<{
        expected: "urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational";
        actual: "urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational";
      }>
    );
    expect(confusion.urgent.urgent).toBe(1);
    expect(confusion.urgent.needs_reply).toBe(1);

    const metrics = scoreClassificationMetrics(
      labels as unknown as Array<"urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational">,
      pairs as Array<{
        expected: "urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational";
        actual: "urgent" | "needs_reply" | "follow_up" | "scheduling" | "informational";
      }>
    );
    expect(metrics.metrics.urgentPrecision).toBe(1);
    expect(metrics.metrics.urgentRecall).toBe(0.5);
    expect(metrics.metrics.needs_replyPrecision).toBe(0.5);
    expect(metrics.metrics.needs_replyRecall).toBe(1);
  });

  it("compares attendee sets case-insensitively", () => {
    expect(
      scoreMeetingAttendees(
        ["MIA.CHEN@solsticehealth.com", "onboarding@syntheci.demo"],
        ["mia.chen@solsticehealth.com", "onboarding@syntheci.demo"]
      )
    ).toBe(true);
    expect(
      scoreMeetingAttendees(["mia.chen@solsticehealth.com"], ["mia.chen@solsticehealth.com", "ops@syntheci.demo"])
    ).toBe(false);
  });

  it("builds latency statistics and percentiles", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(20);

    const stats = buildLatencyStats([40, 10, 30, 20]);
    expect(stats.samplesMs).toEqual([10, 20, 30, 40]);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(40);
    expect(stats.medianMs).toBe(20);
    expect(stats.p95Ms).toBe(40);
  });

  it("creates stable support ref keys", () => {
    expect(
      supportRefKey({
        sourceType: "upload",
        key: "q2-plan"
      })
    ).toBe("upload:q2-plan");
  });
});
