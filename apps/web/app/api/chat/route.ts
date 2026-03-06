import { convertToModelMessages, isTextUIPart, type UIMessage } from "ai";
import { z } from "zod";

import { streamAnswerWithCitations } from "@syntheci/ai";
import type { ChatCitation, SourceType } from "@syntheci/shared";

import { retrieveContextChunks } from "@/lib/retrieval";
import { requireWorkspaceContext } from "@/lib/session";

const sourceTypeSchema = z.enum(["gmail", "slack", "note", "upload", "link"]);

const requestSchema = z.object({
  messages: z.array(z.any()).min(1),
  sourceTypes: z.array(sourceTypeSchema).optional()
});

interface ChatMetadata {
  sourceTypes?: SourceType[];
  citations?: ChatCitation[];
}

type ChatMessage = UIMessage<ChatMetadata>;

function extractLatestUserPrompt(messages: ChatMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) return null;

  const text = latestUserMessage.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (text.length === 0) return null;

  return {
    question: text,
    sourceTypes: latestUserMessage.metadata?.sourceTypes
  };
}

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());
  const messages = body.messages as ChatMessage[];
  const latestPrompt = extractLatestUserPrompt(messages);

  if (!latestPrompt) {
    return new Response(JSON.stringify({ error: "No user question found in chat messages." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const chunks = await retrieveContextChunks({
    workspaceId,
    question: latestPrompt.question,
    sourceTypes: latestPrompt.sourceTypes ?? body.sourceTypes
  });

  const modelMessages = await convertToModelMessages(
    messages.map((message) => ({
      role: message.role,
      parts: message.parts,
      metadata: message.metadata
    }))
  );

  const { result, citations } = streamAnswerWithCitations({
    question: latestPrompt.question,
    chunks,
    messages: modelMessages
  });

  return result.toUIMessageStreamResponse<ChatMessage>({
    originalMessages: messages,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { citations };
      }
      return undefined;
    },
    sendSources: false
  });
}
