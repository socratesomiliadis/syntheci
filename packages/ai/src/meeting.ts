import { generateObject } from "ai";
import { z } from "zod";

import { chatModel } from "./client";
import { MEETING_EXTRACTION_PROMPT } from "./prompts";

const meetingProposalSchema = z.object({
  hasSchedulingIntent: z.boolean(),
  title: z.string().min(1).optional(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  attendees: z.array(z.string().email()).default([]),
  rationale: z.string().min(1)
});

export async function extractMeetingProposal(input: {
  subject?: string | null;
  body: string;
  sender?: string | null;
  timezone: string;
}) {
  const { object } = await generateObject({
    model: chatModel,
    schema: meetingProposalSchema,
    system: MEETING_EXTRACTION_PROMPT,
    prompt: JSON.stringify(input)
  });

  return meetingProposalSchema.parse(object);
}
