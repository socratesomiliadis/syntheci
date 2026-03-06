import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedMock: vi.fn(),
  generateTextMock: vi.fn(),
  streamTextMock: vi.fn()
}));

vi.mock("ai", () => ({
  embed: mocks.embedMock,
  generateText: mocks.generateTextMock,
  streamText: mocks.streamTextMock
}));

vi.mock("./client", () => ({
  chatModel: { id: "chat-model" },
  embeddingModel: { id: "embedding-model" }
}));

import { answerWithCitations, embedQuery, streamAnswerWithCitations } from "./chat";

describe("chat workflows", () => {
  beforeEach(() => {
    mocks.embedMock.mockReset();
    mocks.generateTextMock.mockReset();
    mocks.streamTextMock.mockReset();
  });

  it("embeds a query", async () => {
    mocks.embedMock.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3]
    });

    await expect(embedQuery("where is the note?")).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(mocks.embedMock).toHaveBeenCalledTimes(1);
    expect(mocks.embedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "where is the note?"
      })
    );
  });

  it("answers with bounded citations", async () => {
    mocks.generateTextMock.mockResolvedValue({
      text: "  Grounded answer.  "
    });

    const chunks = Array.from({ length: 8 }, (_, index) => ({
      id: `chunk-${index + 1}`,
      sourceType: "note" as const,
      sourceId: "source-1",
      messageOrDocId: `doc-${index + 1}`,
      content: `chunk-content-${index + 1}`.repeat(30),
      deepLink: null
    }));

    const result = await answerWithCitations({
      question: "Summarize",
      chunks
    });

    expect(result.answer).toBe("Grounded answer.");
    expect(result.citations).toHaveLength(6);
    expect(result.citations[0].snippet.length).toBeLessThanOrEqual(300);
    expect(mocks.generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Question: Summarize")
      })
    );
  });

  it("streams answer and returns citation metadata", () => {
    const streamResult = { stream: true };
    mocks.streamTextMock.mockReturnValue(streamResult);

    const output = streamAnswerWithCitations({
      question: "Any updates?",
      chunks: [
        {
          id: "chunk-1",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "msg-1",
          content: "Meeting moved to 3pm.",
          deepLink: "https://mail.google.com/mail/u/0/#inbox/abc"
        }
      ],
      messages: [{ role: "user", content: "What changed?" }]
    });

    expect(output.result).toBe(streamResult);
    expect(output.citations).toHaveLength(1);
    expect(output.citations[0].sourceType).toBe("gmail");
    expect(mocks.streamTextMock).toHaveBeenCalledTimes(1);
  });
});
