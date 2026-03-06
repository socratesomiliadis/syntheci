import { generateObject } from "ai";
import { z } from "zod";

import { triageResultSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { TRIAGE_PROMPT } from "./prompts";

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
  const { object } = await generateObject({
    model: chatModel,
    schema: triageOutputSchema,
    system: TRIAGE_PROMPT,
    prompt: JSON.stringify(input)
  });

  return triageOutputSchema.parse(object);
}
