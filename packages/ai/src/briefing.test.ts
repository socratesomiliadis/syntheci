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
    expect(call.prompt).toBe(
      JSON.stringify({
        openThreads: [{ id: "t1", supportingSourceRefs: [] }],
        urgentItems: [],
        followUps: [],
        upcomingMeetings: []
      })
    );
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

  it("builds a deterministic briefing from enriched thread context", async () => {
    const result = await generateDailyBriefing({
      openThreads: [
        {
          id: "apollo",
          subject: "Need tonight's launch readiness summary",
          body: "Please include the onboarding blockers and revised order form status by 7pm.",
          sender: "nina@example.com",
          isUnread: true,
          triageLabel: "urgent",
          primarySourceRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "apollo"
          },
          supportingSourceRefs: []
        },
        {
          id: "vectorops",
          subject: "Can you approve the updated partner proposal?",
          body: "Reply with approval so I can send the final draft to legal.",
          sender: "lena@example.com",
          isUnread: true,
          triageLabel: "needs_reply",
          primarySourceRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "vectorops"
          },
          supportingSourceRefs: [
            {
              sourceType: "link",
              sourceId: "link-source",
              messageOrDocId: "partnership-playbook"
            }
          ]
        },
        {
          id: "helios",
          subject: "Need commercial sign-off on the Helios renewal",
          body: "Procurement needs confirmation on the support SLA and discount.",
          sender: "sara@example.com",
          isUnread: true,
          triageLabel: "needs_reply",
          primarySourceRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "helios"
          },
          supportingSourceRefs: [
            {
              sourceType: "note",
              sourceId: "note-source",
              messageOrDocId: "procurement-faq-note"
            }
          ]
        },
        {
          id: "security",
          subject: "Blocking issue on SSO testing before security review",
          body: "This blocker affects Catalyst security review readiness for tomorrow.",
          sender: "priya@example.com",
          isUnread: true,
          triageLabel: "urgent",
          primarySourceRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "sso-escalation"
          },
          supportingSourceRefs: [
            {
              sourceType: "upload",
              sourceId: "upload-source",
              messageOrDocId: "security-qa-pack"
            },
            {
              sourceType: "link",
              sourceId: "link-source",
              messageOrDocId: "security-overview"
            }
          ]
        },
        {
          id: "investor",
          subject: "Following up on next week's board preview",
          body: "Checking in on top customer wins and pipeline conversion for Northstar.",
          sender: "omar@example.com",
          isUnread: false,
          triageLabel: "follow_up",
          primarySourceRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "investor-follow-up"
          },
          supportingSourceRefs: [
            {
              sourceType: "upload",
              sourceId: "upload-source",
              messageOrDocId: "board-preview-outline"
            },
            {
              sourceType: "upload",
              sourceId: "upload-source",
              messageOrDocId: "partner-pipeline-export"
            }
          ]
        }
      ],
      urgentItems: [],
      followUps: [],
      upcomingMeetings: [
        {
          id: "meeting-1",
          title: "Apollo launch war room",
          startsAt: "2026-03-16T16:00:00.000Z",
          attendees: [],
          status: "approved",
          sourceMessageRef: {
            sourceType: "gmail",
            sourceId: "gmail-source",
            messageOrDocId: "apollo"
          }
        }
      ]
    });

    expect(mocks.generateObjectMock).not.toHaveBeenCalled();
    expect(
      result.items.map((item) => ({
        type: item.type,
        refs: item.sourceRefs.map((ref) => `${ref.sourceType}:${ref.messageOrDocId}`)
      }))
    ).toEqual([
      {
        type: "priority",
        refs: ["gmail:apollo"]
      },
      {
        type: "todo",
        refs: ["gmail:helios", "note:procurement-faq-note"]
      },
      {
        type: "todo",
        refs: ["gmail:vectorops", "link:partnership-playbook"]
      },
      {
        type: "meeting",
        refs: ["gmail:apollo"]
      },
      {
        type: "followup",
        refs: ["gmail:sso-escalation", "upload:security-qa-pack", "link:security-overview"]
      },
      {
        type: "followup",
        refs: [
          "gmail:investor-follow-up",
          "upload:board-preview-outline",
          "upload:partner-pipeline-export"
        ]
      }
    ]);
  });
});
