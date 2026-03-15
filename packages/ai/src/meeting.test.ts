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
    const input = {
      subject: "Can we sync Tuesday?",
      body: "Let's meet at 11:00 Athens time.",
      sender: "alex@example.com",
      timezone: "Europe/Athens",
      referenceTime: "2026-03-08T10:00:00.000Z"
    };

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

    await expect(extractMeetingProposal(input)).resolves.toEqual({
      hasSchedulingIntent: true,
      title: "Launch Sync",
      startsAt: "2026-03-10T09:00:00.000Z",
      endsAt: "2026-03-10T09:30:00.000Z",
      attendees: ["alex@example.com"],
      rationale: "Explicit scheduling request."
    });

    expect(mocks.generateObjectMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateObjectMock.mock.calls[0][0];
    expect(call.system).toContain("Use the provided timezone to interpret relative dates and times.");
    expect(call.system).toContain("When referenceTime is provided, use it as the anchor");
    expect(call.system).toContain("Set startsAt and endsAt to ISO datetimes only when the message gives enough information; otherwise use null.");
    expect(call.system).toContain("Include attendees only when explicit email addresses are stated in the message; otherwise use [].");
    expect(call.prompt).toBe(JSON.stringify(input));
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

  it("rejects proposals whose end time is not after the start time", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        hasSchedulingIntent: true,
        title: "Broken Timing",
        startsAt: "2026-03-10T09:30:00.000Z",
        endsAt: "2026-03-10T09:00:00.000Z",
        attendees: [],
        rationale: "Includes a meeting time."
      }
    });

    await expect(
      extractMeetingProposal({
        body: "Let's meet at 11.",
        timezone: "Europe/Athens"
      })
    ).rejects.toThrow("endsAt must be after startsAt");
  });

  it("accepts ISO timestamps with explicit timezone offsets", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        hasSchedulingIntent: true,
        title: "Offset Time",
        startsAt: "2026-03-19T10:00:00+02:00",
        endsAt: "2026-03-19T10:30:00+02:00",
        attendees: [],
        rationale: "Explicit scheduling request."
      }
    });

    await expect(
      extractMeetingProposal({
        body: "Thursday at 10:00 Athens works.",
        timezone: "Europe/Athens",
        referenceTime: "2026-03-14T12:25:00.000Z"
      })
    ).resolves.toEqual({
      hasSchedulingIntent: true,
      title: "Offset Time",
      startsAt: "2026-03-19T10:00:00+02:00",
      endsAt: "2026-03-19T10:30:00+02:00",
      attendees: [],
      rationale: "Explicit scheduling request."
    });
  });
});
