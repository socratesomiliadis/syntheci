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
    await expect(
      classifyMessageTriage({
        subject: "Move tomorrow's sync",
        body: "Can we push our meeting to 4pm?",
        sender: "alex@example.com"
      })
    ).resolves.toEqual({
      label: "scheduling",
      confidence: 0.93,
      rationale: "The message is primarily about confirming or changing a meeting time."
    });
  });

  it("uses a heuristic follow-up classification for low-pressure nudges", async () => {
    await expect(
      classifyMessageTriage({
        subject: "Following up on next week's board preview",
        body: "Checking in on the board preview deck. It would help to see the top customer wins.",
        sender: "omar@example.com"
      })
    ).resolves.toEqual({
      label: "follow_up",
      confidence: 0.82,
      rationale: "The message adds context or makes a low-pressure request that can be handled later."
    });

    expect(mocks.generateObjectMock).not.toHaveBeenCalled();
  });

  it("treats concrete approval asks as needs_reply instead of urgent", async () => {
    await expect(
      classifyMessageTriage({
        subject: "Can you approve the updated partner proposal?",
        body: "If this looks good, reply with approval so I can send the final draft tomorrow morning.",
        sender: "lena@example.com"
      })
    ).resolves.toEqual({
      label: "needs_reply",
      confidence: 0.89,
      rationale: "The sender is waiting on a concrete answer, approval, or artifact."
    });

    expect(mocks.generateObjectMock).not.toHaveBeenCalled();
  });

  it("does not treat soft scheduling language as scheduling when it is still a follow-up", async () => {
    await expect(
      classifyMessageTriage({
        subject: "Can you join a customer reference call next week?",
        body: "If you are open to it, I can line up a 30-minute reference call early next week.",
        sender: "james@example.com"
      })
    ).resolves.toEqual({
      label: "follow_up",
      confidence: 0.82,
      rationale: "The message adds context or makes a low-pressure request that can be handled later."
    });

    expect(mocks.generateObjectMock).not.toHaveBeenCalled();
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
