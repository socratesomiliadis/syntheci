import { describe, expect, it } from "vitest";

import {
  chatConversationDetailSchema,
  dailyBriefingSchema,
  triageResultSchema
} from "./schemas";

describe("triageResultSchema", () => {
  it("accepts valid triage payload", () => {
    const result = triageResultSchema.parse({
      label: "urgent",
      confidence: 0.92,
      rationale: "Requires immediate response."
    });

    expect(result.label).toBe("urgent");
  });

  it("rejects invalid confidence", () => {
    expect(() =>
      triageResultSchema.parse({
        label: "urgent",
        confidence: 2,
        rationale: "invalid"
      })
    ).toThrowError();
  });
});

describe("dailyBriefingSchema", () => {
  it("accepts briefing with items", () => {
    const parsed = dailyBriefingSchema.parse({
      summary: "Focus on urgent inbox threads",
      items: [
        {
          type: "priority",
          title: "Reply to investor update",
          reason: "High urgency and pending response",
          sourceRefs: []
        }
      ]
    });

    expect(parsed.items).toHaveLength(1);
  });
});

describe("chatConversationDetailSchema", () => {
  it("accepts persisted conversation payloads", () => {
    const parsed = chatConversationDetailSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Review follow-up thread",
      createdAt: "2026-03-11T19:00:00.000Z",
      updatedAt: "2026-03-11T19:05:00.000Z",
      latestMessageAt: "2026-03-11T19:05:00.000Z",
      preview: "Can you summarize the latest reply?",
      messages: [
        {
          id: "123e4567-e89b-12d3-a456-426614174001",
          conversationId: "123e4567-e89b-12d3-a456-426614174000",
          role: "user",
          parts: [
            {
              type: "text",
              text: "Can you summarize the latest reply?"
            }
          ],
          sourceTypes: ["gmail"],
          citations: [],
          createdAt: "2026-03-11T19:05:00.000Z"
        }
      ]
    });

    expect(parsed.messages[0]?.role).toBe("user");
  });
});
