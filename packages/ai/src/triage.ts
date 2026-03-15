import { generateObject } from "ai";
import { z } from "zod";

import { triageResultSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { TRIAGE_PROMPT } from "./prompts";

const triageInputSchema = z.object({
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  sender: z.string().nullable().optional()
});

const triageOutputSchema = z.object({
  label: triageResultSchema.shape.label,
  confidence: triageResultSchema.shape.confidence,
  rationale: triageResultSchema.shape.rationale
});

export async function classifyMessageTriage(input: {
  subject?: string | null;
  body: string;
  sender?: string | null;
}) {
  const parsedInput = triageInputSchema.parse(input);
  const { object } = await generateObject({
    model: chatModel,
    schema: triageOutputSchema,
    system: TRIAGE_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return triageOutputSchema.parse(object);
}
