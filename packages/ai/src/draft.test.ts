import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateTextMock: vi.fn()
}));

vi.mock("ai", () => ({
  generateText: mocks.generateTextMock
}));

vi.mock("./client", () => ({
  chatModel: { id: "chat-model" }
}));

import { generateReplyDraft } from "./draft";

describe("generateReplyDraft", () => {
  beforeEach(() => {
    mocks.generateTextMock.mockReset();
  });

  it("trims and returns model output", async () => {
    const input = {
      subject: "Schedule",
      body: "Can we meet this week?",
      tone: "friendly",
      instructions: "If timing is unclear, ask a follow-up question."
    };

    mocks.generateTextMock.mockResolvedValue({
      text: "\nSure, let's do Thursday at 2pm.\n"
    });

    await expect(generateReplyDraft(input)).resolves.toBe("Sure, let's do Thursday at 2pm.");

    expect(mocks.generateTextMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateTextMock.mock.calls[0][0];
    expect(call.system).toContain("Write only the reply body.");
    expect(call.system).toContain("Do not invent commitments, dates, times, or details.");
    expect(call.system).toContain("If key information is missing, ask for clarification instead of guessing.");
    expect(call.prompt).toBe(JSON.stringify(input));
  });

  it("rejects an empty message body", async () => {
    await expect(
      generateReplyDraft({
        body: ""
      })
    ).rejects.toThrow();
  });
});
