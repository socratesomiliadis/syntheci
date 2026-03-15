import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

const chatModelName =
  process.env.GROQ_CHAT_MODEL ?? "moonshotai/kimi-k2-instruct-0905";
const embeddingModelName =
  process.env.GOOGLE_EMBEDDING_MODEL ?? "gemini-embedding-001";

// Keep embeddings aligned with the existing pgvector column width.
export const embeddingDimensions = 1536;

export const chatModelVersion = chatModelName;
export const embeddingModelVersion = embeddingModelName;

export const chatModel = groq(chatModelName);
export const embeddingModel = google.textEmbedding(embeddingModelName);
