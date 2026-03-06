import { embedMany } from "ai";

import { embeddingModel } from "./client";

export async function embedTexts(values: string[]) {
  if (values.length === 0) {
    return [];
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values
  });

  return embeddings;
}
