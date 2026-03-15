import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedTextMock: vi.fn(),
  generateObjectMock: vi.fn(),
  streamTextMock: vi.fn()
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObjectMock,
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
    mocks.generateObjectMock.mockReset();
    mocks.streamTextMock.mockReset();
  });

  it("embeds a query", async () => {
    mocks.embedTextMock.mockResolvedValue([0.1, 0.2, 0.3]);

    await expect(embedQuery("where is the note?")).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(mocks.embedTextMock).toHaveBeenCalledTimes(1);
    expect(mocks.embedTextMock).toHaveBeenCalledWith("where is the note?");
  });

  it("answers with bounded citations", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        answer: "  Grounded answer.  ",
        citationNumbers: [2, 4, 2, 99]
      }
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
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0]?.messageOrDocId).toBe("doc-2");
    expect(result.citations[1]?.messageOrDocId).toBe("doc-4");
    expect(result.citations[0].snippet.length).toBeLessThanOrEqual(300);
    expect(mocks.generateObjectMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateObjectMock.mock.calls[0][0];
    expect(call.system).toContain("Use provided evidence when it is relevant.");
    expect(call.system).toContain(
      "For source-specific questions, treat matching source records as canonical"
    );
    expect(call.system).toContain("Do not present unsupported claims as certain.");
    expect(call.system).toContain("Use inline citations like [1] when citing evidence.");
    expect(call.system).toContain("Evidence:\n[1] (note) chunk-content-1");
    expect(call.prompt).toContain("Question: Summarize");
    expect(call.prompt).toContain("citationNumbers");
  });

  it("marks missing evidence explicitly when no chunks are retrieved", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        answer: "Need more context.",
        citationNumbers: []
      }
    });

    const result = await answerWithCitations({
      question: "What changed?",
      chunks: []
    });

    expect(result.answer).toBe("Need more context.");
    expect(result.citations).toEqual([]);

    const call = mocks.generateObjectMock.mock.calls[0][0];
    expect(call.system).toContain("Evidence:\nNo evidence provided.");
  });

  it("falls back to lexical citations when the model returns none", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        answer: "Start with the Helios renewal and the VectorOps proposal.",
        citationNumbers: []
      }
    });

    const result = await answerWithCitations({
      question: "Which commercial threads need my attention first?",
      chunks: [
        {
          id: "chunk-1",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "helios-renewal",
          content: "Subject: Need commercial sign-off on the Helios renewal",
          deepLink: null
        },
        {
          id: "chunk-2",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "vectorops-proposal",
          content: "Subject: Can you approve the updated partner proposal?",
          deepLink: null
        },
        {
          id: "chunk-3",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "monthly-report",
          content: "Sharing the February operating report for awareness.",
          deepLink: null
        }
      ]
    });

    expect(result.citations.map((citation) => citation.messageOrDocId)).toEqual([
      "helios-renewal",
      "vectorops-proposal"
    ]);
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

  it("bounds streaming citations to the strongest few chunks instead of returning the full retrieval set", () => {
    const streamResult = { stream: true };
    mocks.streamTextMock.mockReturnValue(streamResult);

    const output = streamAnswerWithCitations({
      question: "What should I send Catalyst before the security review?",
      chunks: [
        {
          id: "chunk-1",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "security-review-email",
          content: "Catalyst needs answers on retention, SSO, and regional storage controls before tomorrow's review.",
          deepLink: null
        },
        {
          id: "chunk-2",
          sourceType: "upload",
          sourceId: "source-2",
          messageOrDocId: "security-qa-pack",
          content: "Security QA pack covers retention, SSO, and regional storage controls for regulated buyers.",
          deepLink: null
        },
        {
          id: "chunk-3",
          sourceType: "note",
          sourceId: "source-3",
          messageOrDocId: "procurement-faq-note",
          content: "Standard answers include retention policy wording and SSO configuration guidance.",
          deepLink: null
        },
        {
          id: "chunk-4",
          sourceType: "link",
          sourceId: "source-4",
          messageOrDocId: "security-overview",
          content: "Security overview article explains operating controls for regulated environments.",
          deepLink: null
        },
        {
          id: "chunk-5",
          sourceType: "gmail",
          sourceId: "source-1",
          messageOrDocId: "monthly-report",
          content: "February operating report with no security details.",
          deepLink: null
        },
        {
          id: "chunk-6",
          sourceType: "note",
          sourceId: "source-3",
          messageOrDocId: "board-note",
          content: "Board prep note about pipeline and launches.",
          deepLink: null
        }
      ],
      messages: [{ role: "user", content: "What should I send?" }]
    });

    expect(output.result).toBe(streamResult);
    expect(output.citations.length).toBeLessThanOrEqual(4);
    expect(output.citations.map((citation) => citation.messageOrDocId)).not.toContain("board-note");
    expect(output.citations.map((citation) => citation.messageOrDocId)).toContain("security-review-email");
  });
});
