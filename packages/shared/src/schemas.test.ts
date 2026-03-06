import { describe, expect, it } from "vitest";

import { dailyBriefingSchema, triageResultSchema } from "./schemas";

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
