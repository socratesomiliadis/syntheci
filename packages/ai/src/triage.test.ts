import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObjectMock: vi.fn()
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObjectMock
}));

vi.mock("./client", () => ({
  chatModel: { id: "chat-model" }
}));

import { classifyMessageTriage } from "./triage";

describe("classifyMessageTriage", () => {
  beforeEach(() => {
    mocks.generateObjectMock.mockReset();
  });

  it("returns validated triage output", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        label: "urgent",
        confidence: 0.91,
        rationale: "Mentions production outage."
      }
    });

    await expect(
      classifyMessageTriage({
        subject: "P1 incident",
        body: "The API is down for all users",
        sender: "ops@example.com"
      })
    ).resolves.toEqual({
      label: "urgent",
      confidence: 0.91,
      rationale: "Mentions production outage."
    });
  });

  it("rejects invalid model outputs", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        label: "urgent",
        confidence: 1.5,
        rationale: "invalid confidence"
      }
    });

    await expect(
      classifyMessageTriage({
        body: "test"
      })
    ).rejects.toThrow();
  });
});
