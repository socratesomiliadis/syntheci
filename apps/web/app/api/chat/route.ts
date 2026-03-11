import { convertToModelMessages, isTextUIPart } from "ai";
import { z } from "zod";

import { streamAnswerWithCitations } from "@syntheci/ai";
import type { ChatConversationMessage } from "@syntheci/shared";

import {
  getChatConversation,
  persistAssistantMessage,
  persistUserMessage,
  type ChatMessage
} from "@/lib/chat";
import type { ChatMessage as UIChatMessage } from "@/lib/chat-ui";
import { retrieveContextChunks } from "@/lib/retrieval";
import { requireWorkspaceContext } from "@/lib/session";

const sourceTypeSchema = z.enum(["gmail", "note", "upload", "link"]);

const requestSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.any()).min(1),
  sourceTypes: z.array(sourceTypeSchema).optional()
});

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

function isModelCompatibleMessage(
  message: ChatConversationMessage
): message is ChatConversationMessage & { role: "user" | "assistant" | "system" } {
  return message.role === "user" || message.role === "assistant" || message.role === "system";
}

export async function POST(request: Request) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());
  const messages = body.messages as ChatMessage[];
  const latestPrompt = extractLatestUserPrompt(messages);

  if (!latestPrompt) {
    return new Response(JSON.stringify({ error: "No user question found in chat messages." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    return new Response(JSON.stringify({ error: "No user message found in request." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const conversation = await getChatConversation({
    conversationId: body.conversationId,
    workspaceId,
    userId: session.user.id
  });

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found." }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }

  await persistUserMessage({
    conversationId: body.conversationId,
    workspaceId,
    userId: session.user.id,
    message: latestUserMessage
  });

  const persistedConversation = await getChatConversation({
    conversationId: body.conversationId,
    workspaceId,
    userId: session.user.id
  });

  if (!persistedConversation) {
    return new Response(JSON.stringify({ error: "Conversation not found." }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }

  const chunks = await retrieveContextChunks({
    workspaceId,
    question: latestPrompt.question,
    sourceTypes: latestPrompt.sourceTypes ?? body.sourceTypes
  });

  const persistedMessagesForModel: Array<Omit<UIChatMessage, "id">> = persistedConversation.messages
      .filter(isModelCompatibleMessage)
      .map((message) => ({
        role: message.role,
        parts: message.parts as UIChatMessage["parts"],
        metadata: {
          sourceTypes: message.sourceTypes,
          citations: message.citations
        }
      }));

  const modelMessages = await convertToModelMessages(persistedMessagesForModel);

  const { result, citations } = streamAnswerWithCitations({
    question: latestPrompt.question,
    chunks,
    messages: modelMessages
  });

  return result.toUIMessageStreamResponse<ChatMessage>({
    originalMessages: messages,
    onFinish: async ({ isAborted, responseMessage }) => {
      if (isAborted || responseMessage.role !== "assistant") {
        return;
      }

      await persistAssistantMessage({
        conversationId: body.conversationId,
        workspaceId,
        userId: session.user.id,
        message: {
          ...responseMessage,
          metadata: {
            ...responseMessage.metadata,
            citations: responseMessage.metadata?.citations ?? citations
          }
        }
      });
    },
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { citations };
      }
      return undefined;
    },
    sendSources: false
  });
}
