import { generateText } from "ai";

import { chatModel } from "./client";
import { DRAFT_REPLY_PROMPT } from "./prompts";

export async function generateReplyDraft(input: {
  subject?: string | null;
  body: string;
  tone?: string | null;
  instructions?: string | null;
}) {
  const { text } = await generateText({
    model: chatModel,
    system: DRAFT_REPLY_PROMPT,
    prompt: JSON.stringify(input)
  });

  return text.trim();
}
