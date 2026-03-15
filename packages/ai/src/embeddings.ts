import { embeddingDimensions, embeddingModel } from "./client";

function embeddingProviderOptions(taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  return {
    google: {
      outputDimensionality: embeddingDimensions,
      taskType
    }
  } as const;
}

async function embedValues(values: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  if (values.length === 0) {
    return [];
  }

  const result = await embeddingModel.doEmbed({
    values,
    providerOptions: embeddingProviderOptions(taskType)
  });

  return result.embeddings;
}

export async function embedText(value: string) {
  const [embedding] = await embedValues([value], "RETRIEVAL_QUERY");
  return embedding;
}

export async function embedTexts(values: string[]) {
  return embedValues(values, "RETRIEVAL_DOCUMENT");
}
