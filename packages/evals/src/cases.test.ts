import { describe, expect, it } from "vitest";

import {
  demoBriefing,
  demoInitialEmails,
  demoLinks,
  demoNotes,
  demoSyncEmailBatches,
  demoUploads
} from "@syntheci/shared";

import {
  briefingCase,
  chatConclusionCases,
  meetingExtractionCases,
  retrievalCases,
  triageCases
} from "./cases";
import type { BenchmarkSupportRef } from "./types";

function buildFixtureSets() {
  const messageKeys = new Set([
    ...demoInitialEmails.map((email) => email.key),
    ...Object.values(demoSyncEmailBatches)
      .flat()
      .map((email) => email.key)
  ]);
  const documentKeys = new Set([
    ...demoNotes.map((note) => note.key),
    ...demoLinks.map((link) => link.key),
    ...demoUploads.map((upload) => upload.key)
  ]);

  return {
    messageKeys,
    documentKeys
  };
}

function expectSupportRefToExist(
  ref: BenchmarkSupportRef,
  fixtures: ReturnType<typeof buildFixtureSets>
) {
  if (ref.sourceType === "gmail") {
    expect(fixtures.messageKeys.has(ref.key)).toBe(true);
    return;
  }

  expect(fixtures.documentKeys.has(ref.key)).toBe(true);
}

describe("benchmark cases", () => {
  it("references only seeded message and document fixture keys", () => {
    const fixtures = buildFixtureSets();

    for (const benchmarkCase of [...retrievalCases, ...chatConclusionCases]) {
      for (const ref of benchmarkCase.supportRefs) {
        expectSupportRefToExist(ref, fixtures);
      }

      for (const ref of benchmarkCase.minimumEvidenceRefs ?? []) {
        expectSupportRefToExist(ref, fixtures);
      }
    }

    for (const item of briefingCase.expectedItems) {
      for (const ref of item.refs) {
        expectSupportRefToExist(ref, fixtures);
      }
    }
  });

  it("keeps triage and meeting cases aligned with seeded emails", () => {
    const fixtures = buildFixtureSets();

    for (const benchmarkCase of triageCases) {
      expect(fixtures.messageKeys.has(benchmarkCase.messageKey)).toBe(true);
    }

    for (const benchmarkCase of meetingExtractionCases) {
      expect(fixtures.messageKeys.has(benchmarkCase.messageKey)).toBe(true);
    }
  });

  it("keeps case ids unique within each suite", () => {
    const suites = {
      retrieval: retrievalCases.map((benchmarkCase) => benchmarkCase.id),
      chat: chatConclusionCases.map((benchmarkCase) => benchmarkCase.id),
      triage: triageCases.map((benchmarkCase) => benchmarkCase.id),
      meetings: meetingExtractionCases.map((benchmarkCase) => benchmarkCase.id)
    };

    for (const ids of Object.values(suites)) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps the benchmark briefing expectation aligned with the seeded briefing", () => {
    expect(briefingCase.briefingDate).toBe(demoBriefing.briefingDate);
    expect(briefingCase.expectedItems).toHaveLength(demoBriefing.items.length);
    expect(briefingCase.expectedPriorityRefs).toHaveLength(
      demoBriefing.items.filter((item) => item.type === "priority").flatMap((item) => item.refs).length
    );
  });
});
