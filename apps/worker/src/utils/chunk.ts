export interface ChunkResult {
  content: string;
  tokenCount: number;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

function estimateTokenCount(text: string) {
  return Math.ceil(text.length / 4);
}

export function chunkText(input: string): ChunkResult[] {
  const text = input.trim();
  if (!text) return [];

  const chunks: ChunkResult[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + CHUNK_SIZE);
    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({
        content,
        tokenCount: estimateTokenCount(content)
      });
    }
    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}
