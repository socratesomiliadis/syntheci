import { describe, expect, it, vi } from "vitest";

vi.mock("@syntheci/ai", () => ({
  embedQuery: vi.fn()
}));

vi.mock("@syntheci/db", () => ({
  db: {
    execute: vi.fn()
  }
}));

describe("buildSourceFilter", () => {
  it("returns an empty sql fragment when no source types are provided", async () => {
    const { buildSourceFilter } = await import("./retrieval");
    const fragment = buildSourceFilter();
    expect(fragment.queryChunks).toHaveLength(0);
  });

  it("builds a scalar IN clause instead of binding a raw JS array", async () => {
    const { buildSourceFilter } = await import("./retrieval");
    const fragment = buildSourceFilter(["gmail", "note"]);

    expect(fragment.queryChunks).toHaveLength(3);
    expect(fragment.queryChunks[0]).toMatchObject({
      value: ["and s.type in ("]
    });
    expect(fragment.queryChunks[2]).toMatchObject({
      value: [")"]
    });

    expect(JSON.stringify(fragment.queryChunks)).not.toContain('[\"gmail\",\"note\"]');
  });
});

describe("inferSourceTypesFromQuestion", () => {
  it("infers contact queries when the user asks for contacts explicitly", async () => {
    const { inferSourceTypesFromQuestion } = await import("./retrieval");

    expect(inferSourceTypesFromQuestion("Give me a list of all my human contacts")).toEqual([
      "contact"
    ]);
  });

  it("infers multiple source types when the question names them", async () => {
    const { inferSourceTypesFromQuestion } = await import("./retrieval");

    expect(inferSourceTypesFromQuestion("Summarize my notes and emails about hiring")).toEqual([
      "note",
      "gmail"
    ]);
  });

  it("returns undefined when the question is not source-specific", async () => {
    const { inferSourceTypesFromQuestion } = await import("./retrieval");

    expect(inferSourceTypesFromQuestion("What should I focus on this week?")).toBeUndefined();
  });
});

describe("buildRetrievalQueryProfile", () => {
  it("detects document-oriented synthesis questions", async () => {
    const { buildRetrievalQueryProfile } = await import("./retrieval");

    const profile = buildRetrievalQueryProfile("What should I send before the review?");

    expect(profile.prefersDocuments).toBe(true);
    expect(profile.needsMultipleEvidence).toBe(true);
    expect(profile.expansionTokens.has("answers")).toBe(true);
  });

  it("keeps contacts in the default retrieval mix and boosts people queries", async () => {
    const { buildRetrievalQueryProfile } = await import("./retrieval");

    const profile = buildRetrievalQueryProfile("Who is the buyer asking about security questions?");

    expect(profile.sourceTypes).toContain("contact");
    expect(profile.prioritizePeople).toBe(true);
  });
});
