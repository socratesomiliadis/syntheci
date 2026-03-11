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
