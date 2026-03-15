import { generateText } from "ai";
import { z } from "zod";

import { chatModel } from "./client";
import { DRAFT_REPLY_PROMPT } from "./prompts";

const draftInputSchema = z.object({
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  tone: z.string().nullable().optional(),
  instructions: z.string().nullable().optional()
});

export async function generateReplyDraft(input: {
  subject?: string | null;
  body: string;
  tone?: string | null;
  instructions?: string | null;
}) {
  const parsedInput = draftInputSchema.parse(input);
  const { text } = await generateText({
    model: chatModel,
    system: DRAFT_REPLY_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return text.trim();
}
