import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedTextMock: vi.fn(),
  generateTextMock: vi.fn(),
  streamTextMock: vi.fn()
}));

vi.mock("ai", () => ({
  generateText: mocks.generateTextMock,
  streamText: mocks.streamTextMock
}));

vi.mock("./embeddings", () => ({
  embedText: mocks.embedTextMock
}));

vi.mock("./client", () => ({
  chatModel: { id: "chat-model" }
}));

import { answerWithCitations, embedQuery, streamAnswerWithCitations } from "./chat";

describe("chat workflows", () => {
  beforeEach(() => {
    mocks.embedTextMock.mockReset();
    mocks.generateTextMock.mockReset();
    mocks.streamTextMock.mockReset();
  });

  it("embeds a query", async () => {
    mocks.embedTextMock.mockResolvedValue([0.1, 0.2, 0.3]);

    await expect(embedQuery("where is the note?")).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(mocks.embedTextMock).toHaveBeenCalledTimes(1);
    expect(mocks.embedTextMock).toHaveBeenCalledWith("where is the note?");
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
    expect(mocks.generateTextMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateTextMock.mock.calls[0][0];
    expect(call.system).toContain("Use provided evidence when it is relevant.");
    expect(call.system).toContain(
      "For source-specific questions, treat matching source records as canonical"
    );
    expect(call.system).toContain("Do not present unsupported claims as certain.");
    expect(call.system).toContain("Use inline citations like [1] when citing evidence.");
    expect(call.prompt).toContain("Question: Summarize");
    expect(call.prompt).toContain("Evidence:\n[1] (note) chunk-content-1");
  });

  it("marks missing evidence explicitly when no chunks are retrieved", async () => {
    mocks.generateTextMock.mockResolvedValue({
      text: "Need more context."
    });

    const result = await answerWithCitations({
      question: "What changed?",
      chunks: []
    });

    expect(result.answer).toBe("Need more context.");
    expect(result.citations).toEqual([]);

    const call = mocks.generateTextMock.mock.calls[0][0];
    expect(call.prompt).toContain("Evidence:\nNo evidence provided.");
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

    const call = mocks.streamTextMock.mock.calls[0][0];
    expect(call.system).toContain("Use inline citations like [1] when citing evidence.");
    expect(call.system).toContain("Evidence:\n[1] (gmail) Meeting moved to 3pm.");
    expect(call.messages).toEqual([{ role: "user", content: "What changed?" }]);
  });
});
