import { openai } from "@ai-sdk/openai";

const chatModelName = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";
const embeddingModelName =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export const chatModel = openai(chatModelName);
export const embeddingModel = openai.embedding(embeddingModelName);
