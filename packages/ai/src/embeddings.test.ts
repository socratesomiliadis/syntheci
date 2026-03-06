import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedManyMock: vi.fn()
}));

vi.mock("ai", () => ({
  embedMany: mocks.embedManyMock
}));

vi.mock("./client", () => ({
  embeddingModel: { id: "embedding-model" }
}));

import { embedTexts } from "./embeddings";

describe("embedTexts", () => {
  beforeEach(() => {
    mocks.embedManyMock.mockReset();
  });

  it("returns empty array when there is no text", async () => {
    await expect(embedTexts([])).resolves.toEqual([]);
    expect(mocks.embedManyMock).not.toHaveBeenCalled();
  });

  it("embeds all values", async () => {
    mocks.embedManyMock.mockResolvedValue({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4]
      ]
    });

    await expect(embedTexts(["a", "b"])).resolves.toEqual([
      [0.1, 0.2],
      [0.3, 0.4]
    ]);
    expect(mocks.embedManyMock).toHaveBeenCalledTimes(1);
  });
});
