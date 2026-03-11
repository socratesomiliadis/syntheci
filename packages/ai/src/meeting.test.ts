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

import { extractMeetingProposal } from "./meeting";

describe("extractMeetingProposal", () => {
  beforeEach(() => {
    mocks.generateObjectMock.mockReset();
  });

  it("returns a valid meeting proposal", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        hasSchedulingIntent: true,
        title: "Launch Sync",
        startsAt: "2026-03-10T09:00:00.000Z",
        endsAt: "2026-03-10T09:30:00.000Z",
        attendees: ["alex@example.com"],
        rationale: "Explicit scheduling request."
      }
    });

    await expect(
      extractMeetingProposal({
        subject: "Can we sync Tuesday?",
        body: "Let's meet at 11:00 Athens time.",
        sender: "alex@example.com",
        timezone: "Europe/Athens"
      })
    ).resolves.toEqual({
      hasSchedulingIntent: true,
      title: "Launch Sync",
      startsAt: "2026-03-10T09:00:00.000Z",
      endsAt: "2026-03-10T09:30:00.000Z",
      attendees: ["alex@example.com"],
      rationale: "Explicit scheduling request."
    });
  });

  it("allows a null title when there is no scheduling intent", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        hasSchedulingIntent: false,
        title: null,
        startsAt: null,
        endsAt: null,
        attendees: [],
        rationale: "No concrete scheduling request."
      }
    });

    await expect(
      extractMeetingProposal({
        body: "Thanks for the update.",
        timezone: "Europe/Athens"
      })
    ).resolves.toEqual({
      hasSchedulingIntent: false,
      title: null,
      startsAt: null,
      endsAt: null,
      attendees: [],
      rationale: "No concrete scheduling request."
    });
  });

  it("rejects malformed attendees", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        hasSchedulingIntent: true,
        title: "Bad Proposal",
        startsAt: "2026-03-10T09:00:00.000Z",
        endsAt: "2026-03-10T09:30:00.000Z",
        attendees: ["not-an-email"],
        rationale: "bad"
      }
    });

    await expect(
      extractMeetingProposal({
        body: "test",
        timezone: "Europe/Athens"
      })
    ).rejects.toThrow();
  });
});
