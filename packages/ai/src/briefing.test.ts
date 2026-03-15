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

import { generateDailyBriefing } from "./briefing";

describe("generateDailyBriefing", () => {
  beforeEach(() => {
    mocks.generateObjectMock.mockReset();
  });

  it("generates a valid briefing", async () => {
    const input = {
      openThreads: [{ id: "t1" }],
      urgentItems: [],
      followUps: [],
      upcomingMeetings: []
    };

    mocks.generateObjectMock.mockResolvedValue({
      object: {
        summary: "Two critical follow-ups.",
        items: [
          {
            type: "priority",
            title: "Reply to CFO",
            reason: "Awaiting budget sign-off",
            sourceRefs: [
              {
                sourceType: "gmail",
                sourceId: "source-1",
                messageOrDocId: "msg-1"
              }
            ]
          }
        ]
      }
    });

    await expect(
      generateDailyBriefing(input)
    ).resolves.toEqual({
      summary: "Two critical follow-ups.",
      items: [
        {
          type: "priority",
          title: "Reply to CFO",
          reason: "Awaiting budget sign-off",
          sourceRefs: [
            {
              sourceType: "gmail",
              sourceId: "source-1",
              messageOrDocId: "msg-1"
            }
          ]
        }
      ]
    });

    expect(mocks.generateObjectMock).toHaveBeenCalledTimes(1);

    const call = mocks.generateObjectMock.mock.calls[0][0];
    expect(call.system).toContain("Map urgent items to priority");
    expect(call.system).toContain("Only include sourceRefs when the input contains the needed source identifiers");
    expect(call.prompt).toBe(JSON.stringify(input));
  });

  it("defaults missing sourceRefs to an empty array", async () => {
    mocks.generateObjectMock.mockResolvedValue({
      object: {
        summary: "One follow-up to handle.",
        items: [
          {
            type: "followup",
            title: "Check in with Alex",
            reason: "Waiting on a status update"
          }
        ]
      }
    });

    await expect(
      generateDailyBriefing({
        openThreads: [],
        urgentItems: [],
        followUps: [{ messageId: "msg-1", label: "follow_up" }],
        upcomingMeetings: []
      })
    ).resolves.toEqual({
      summary: "One follow-up to handle.",
      items: [
        {
          type: "followup",
          title: "Check in with Alex",
          reason: "Waiting on a status update",
          sourceRefs: []
        }
      ]
    });
  });
});
