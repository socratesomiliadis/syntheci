import { embed, generateText } from "ai";
import { z } from "zod";

import { chatAnswerSchema, sourceTypeSchema } from "@syntheci/shared";

import { chatModel, embeddingModel } from "./client";
import { SYSTEM_PROMPT } from "./prompts";

const retrievalChunkSchema = z.object({
  id: z.string(),
  sourceType: sourceTypeSchema,
  sourceId: z.string(),
  messageOrDocId: z.string(),
  content: z.string(),
  deepLink: z.string().nullable()
});

const chatInputSchema = z.object({
  question: z.string().min(1),
  chunks: z.array(retrievalChunkSchema)
});

export async function embedQuery(query: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query
  });
  return embedding;
}

export async function answerWithCitations(rawInput: z.infer<typeof chatInputSchema>) {
  const input = chatInputSchema.parse(rawInput);
  const context = input.chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: chatModel,
    system: `${SYSTEM_PROMPT}
You will receive numbered evidence snippets.
When answering, rely on evidence and cite the snippet numbers used.`,
    prompt: `Question: ${input.question}\n\nEvidence:\n${context}`
  });

  const citations = input.chunks.slice(0, 6).map((chunk) => ({
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    messageOrDocId: chunk.messageOrDocId,
    snippet: chunk.content.slice(0, 300),
    startOffset: 0,
    endOffset: Math.min(chunk.content.length, 300),
    deepLink: chunk.deepLink
  }));

  return chatAnswerSchema.parse({
    answer: text.trim(),
    citations
  });
}
