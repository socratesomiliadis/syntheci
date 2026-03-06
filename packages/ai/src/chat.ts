import { embed, generateText, streamText, type ModelMessage } from "ai";
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

const streamChatInputSchema = chatInputSchema.extend({
  messages: z.array(z.any()).default([])
});

export async function embedQuery(query: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query
  });
  return embedding;
}

function buildContext(chunks: z.infer<typeof retrievalChunkSchema>[]) {
  return chunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n");
}

function buildCitations(chunks: z.infer<typeof retrievalChunkSchema>[]) {
  return chunks.slice(0, 6).map((chunk) => ({
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    messageOrDocId: chunk.messageOrDocId,
    snippet: chunk.content.slice(0, 300),
    startOffset: 0,
    endOffset: Math.min(chunk.content.length, 300),
    deepLink: chunk.deepLink
  }));
}

export async function answerWithCitations(rawInput: z.infer<typeof chatInputSchema>) {
  const input = chatInputSchema.parse(rawInput);
  const context = buildContext(input.chunks);

  const { text } = await generateText({
    model: chatModel,
    system: `${SYSTEM_PROMPT}
You will receive numbered evidence snippets.
When answering, rely on evidence and cite the snippet numbers used.`,
    prompt: `Question: ${input.question}\n\nEvidence:\n${context}`
  });

  const citations = buildCitations(input.chunks);

  return chatAnswerSchema.parse({
    answer: text.trim(),
    citations
  });
}

export function streamAnswerWithCitations(rawInput: z.infer<typeof streamChatInputSchema>) {
  const input = streamChatInputSchema.parse(rawInput);
  const context = buildContext(input.chunks);
  const citations = buildCitations(input.chunks);

  const result = streamText({
    model: chatModel,
    system: `${SYSTEM_PROMPT}
You will receive numbered evidence snippets.
When answering, rely on evidence and cite the snippet numbers used.

Evidence:
${context}`,
    messages: input.messages as ModelMessage[]
  });

  return { result, citations };
}
