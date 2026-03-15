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
    const input = {
      subject: "P1 incident",
      body: "The API is down for all users",
      sender: "ops@example.com"
    };

    mocks.generateObjectMock.mockResolvedValue({
      object: {
        label: "urgent",
        confidence: 0.91,
        rationale: "Mentions production outage."
      }
    });

    await expect(classifyMessageTriage(input)).resolves.toEqual({
      label: "urgent",
      confidence: 0.91,
      rationale: "Mentions production outage."
    });

    expect(mocks.generateObjectMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateObjectMock.mock.calls[0][0];
    expect(call.system).toContain("If multiple labels fit, prefer urgent > needs_reply > follow_up > scheduling > informational.");
    expect(call.system).toContain("needs_reply: the sender is asking for a response or decision soon.");
    expect(call.prompt).toBe(JSON.stringify(input));
  });

  it("accepts scheduling classifications", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        label: "scheduling",
        confidence: 0.64,
        rationale: "The message is mainly about moving a meeting."
      }
    });

    await expect(
      classifyMessageTriage({
        subject: "Move tomorrow's sync",
        body: "Can we push our meeting to 4pm?",
        sender: "alex@example.com"
      })
    ).resolves.toEqual({
      label: "scheduling",
      confidence: 0.64,
      rationale: "The message is mainly about moving a meeting."
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

  it("rejects empty message bodies", async () => {
    await expect(
      classifyMessageTriage({
        body: ""
      })
    ).rejects.toThrow();
  });
});
