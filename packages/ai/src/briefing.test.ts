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
      generateDailyBriefing({
        openThreads: [{ id: "t1" }],
        urgentItems: [],
        followUps: [],
        upcomingMeetings: []
      })
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
  });
});
