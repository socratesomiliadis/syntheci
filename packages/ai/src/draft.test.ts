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
    mocks.generateTextMock.mockResolvedValue({
      text: "\nSure, let's do Thursday at 2pm.\n"
    });

    await expect(
      generateReplyDraft({
        subject: "Schedule",
        body: "Can we meet this week?",
        tone: "friendly"
      })
    ).resolves.toBe("Sure, let's do Thursday at 2pm.");
  });
});
