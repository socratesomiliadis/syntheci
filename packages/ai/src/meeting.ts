import { generateObject } from "ai";
import { z } from "zod";

import { chatModel } from "./client";
import { MEETING_EXTRACTION_PROMPT } from "./prompts";

const meetingProposalSchema = z.object({
  hasSchedulingIntent: z.boolean(),
  title: z.string().min(1).nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  attendees: z.array(z.string().email()),
  rationale: z.string().min(1)
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endsAt must be after startsAt",
      path: ["endsAt"]
    });
  }
});

const meetingExtractionInputSchema = z.object({
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  sender: z.string().nullable().optional(),
  timezone: z.string().min(1)
});

export async function extractMeetingProposal(input: {
  subject?: string | null;
  body: string;
  sender?: string | null;
  timezone: string;
}) {
  const parsedInput = meetingExtractionInputSchema.parse(input);
  const { object } = await generateObject({
    model: chatModel,
    schema: meetingProposalSchema,
    system: MEETING_EXTRACTION_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return meetingProposalSchema.parse(object);
}
