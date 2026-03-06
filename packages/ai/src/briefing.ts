import { generateObject } from "ai";
import { z } from "zod";

import { dailyBriefingSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { BRIEFING_PROMPT } from "./prompts";

const briefingInputSchema = z.object({
  openThreads: z.array(z.record(z.any())),
  urgentItems: z.array(z.record(z.any())),
  followUps: z.array(z.record(z.any())),
  upcomingMeetings: z.array(z.record(z.any()))
});

export async function generateDailyBriefing(input: z.infer<typeof briefingInputSchema>) {
  const parsedInput = briefingInputSchema.parse(input);
  const { object } = await generateObject({
    model: chatModel,
    schema: dailyBriefingSchema,
    system: BRIEFING_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return dailyBriefingSchema.parse(object);
}
