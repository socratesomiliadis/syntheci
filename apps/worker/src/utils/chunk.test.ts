import { describe, expect, it } from "vitest";

import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns empty for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("splits large content into overlapping chunks", () => {
    const text = "a".repeat(3000);
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content.length).toBeGreaterThan(0);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });
});
