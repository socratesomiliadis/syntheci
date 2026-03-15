import { generateObject, streamText, type ModelMessage } from "ai";
import { z } from "zod";

import { chatAnswerSchema, sourceTypeSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { embedText } from "./embeddings";
import { buildGroundedChatSystemPrompt } from "./prompts";

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

const CITATION_CONTEXT_LIMIT = 5;
const CITATION_STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "before",
  "from",
  "have",
  "into",
  "just",
  "need",
  "should",
  "that",
  "their",
  "them",
  "they",
  "this",
  "what",
  "when",
  "which",
  "with",
  "your"
]);

export async function embedQuery(query: string) {
  return embedText(query);
}

function buildContext(chunks: z.infer<typeof retrievalChunkSchema>[]) {
  const evidence = chunks
    .map((chunk, index) => `[${index + 1}] (${chunk.sourceType}) ${chunk.content}`)
    .join("\n\n");
  return evidence || "No evidence provided.";
}

function buildCitations(chunks: z.infer<typeof retrievalChunkSchema>[]) {
  return chunks.map((chunk) => ({
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    messageOrDocId: chunk.messageOrDocId,
    snippet: chunk.content.slice(0, 300),
    startOffset: 0,
    endOffset: Math.min(chunk.content.length, 300),
    deepLink: chunk.deepLink
  }));
}

function tokenizeCitationText(text: string) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (token) => token.length > 2 && !CITATION_STOPWORDS.has(token)
  );
}

function chooseFallbackCitations(input: {
  question: string;
  answer: string;
  chunks: z.infer<typeof retrievalChunkSchema>[];
}) {
  const questionTokens = new Set(tokenizeCitationText(input.question));
  const answerTokens = new Set(tokenizeCitationText(input.answer));

  const scored = input.chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase();
      let score = 0;

      for (const token of questionTokens) {
        if (content.includes(token)) {
          score += 2;
        }
      }

      for (const token of answerTokens) {
        if (content.includes(token)) {
          score += 1;
        }
      }

      if (/\b(blocker|blocked|blocking|urgent|review|approval|renewal|proposal)\b/.test(content)) {
        score += 1;
      }

      return {
        chunk,
        score
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((item) => item.chunk);

  return scored;
}

export async function answerWithCitations(rawInput: z.infer<typeof chatInputSchema>) {
  const input = chatInputSchema.parse(rawInput);
  const citationWindow = input.chunks.slice(0, CITATION_CONTEXT_LIMIT);
  const context = buildContext(citationWindow);

  const { object } = await generateObject({
    model: chatModel,
    schema: z.object({
      answer: z.string().min(1),
      citationNumbers: z.array(z.number().int().positive()).max(3).default([])
    }),
    system: buildGroundedChatSystemPrompt(context),
    prompt: `Question: ${input.question}

Return:
- answer: a concise grounded answer
- citationNumbers: up to 3 evidence numbers that directly support the answer

Rules:
- cite only chunks that directly support the final answer
- do not cite irrelevant evidence just because it was provided
- prefer the strongest evidence from the first few chunks over weaker later references
- if the evidence is insufficient, say what is missing and use [] for citationNumbers`
  });

  const citations = [...new Set(object.citationNumbers)]
    .map((citationNumber) => citationWindow[citationNumber - 1])
    .filter(
      (chunk): chunk is z.infer<typeof retrievalChunkSchema> =>
        Boolean(chunk)
    );
  const resolvedCitations =
    citations.length > 0
      ? citations
      : chooseFallbackCitations({
          question: input.question,
          answer: object.answer,
          chunks: citationWindow
        });

  return chatAnswerSchema.parse({
    answer: object.answer.trim(),
    citations: buildCitations(resolvedCitations)
  });
}

export function streamAnswerWithCitations(rawInput: z.infer<typeof streamChatInputSchema>) {
  const input = streamChatInputSchema.parse(rawInput);
  const context = buildContext(input.chunks);
  const citations = buildCitations(input.chunks);

  const result = streamText({
    model: chatModel,
    system: buildGroundedChatSystemPrompt(context),
    messages: input.messages as ModelMessage[]
  });

  return { result, citations };
}
