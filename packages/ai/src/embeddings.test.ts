import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doEmbedMock: vi.fn()
}));

vi.mock("./client", () => ({
  embeddingDimensions: 1536,
  embeddingModel: {
    doEmbed: mocks.doEmbedMock
  }
}));

import { embedText, embedTexts } from "./embeddings";

describe("embedTexts", () => {
  beforeEach(() => {
    mocks.doEmbedMock.mockReset();
  });

  it("returns empty array when there is no text", async () => {
    await expect(embedTexts([])).resolves.toEqual([]);
    expect(mocks.doEmbedMock).not.toHaveBeenCalled();
  });

  it("embeds all values", async () => {
    mocks.doEmbedMock.mockResolvedValue({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4]
      ]
    });

    await expect(embedTexts(["a", "b"])).resolves.toEqual([
      [0.1, 0.2],
      [0.3, 0.4]
    ]);
    expect(mocks.doEmbedMock).toHaveBeenCalledTimes(1);
    expect(mocks.doEmbedMock).toHaveBeenCalledWith({
      values: ["a", "b"],
      providerOptions: {
        google: {
          outputDimensionality: 1536,
          taskType: "RETRIEVAL_DOCUMENT"
        }
      }
    });
  });

  it("embeds a single query with retrieval query settings", async () => {
    mocks.doEmbedMock.mockResolvedValue({
      embeddings: [[0.5, 0.6]]
    });

    await expect(embedText("where is the note?")).resolves.toEqual([0.5, 0.6]);
    expect(mocks.doEmbedMock).toHaveBeenCalledWith({
      values: ["where is the note?"],
      providerOptions: {
        google: {
          outputDimensionality: 1536,
          taskType: "RETRIEVAL_QUERY"
        }
      }
    });
  });
});
