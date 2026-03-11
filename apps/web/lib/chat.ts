import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { isTextUIPart, type UIMessage } from "ai";

import {
  chatConversationDetailSchema,
  chatConversationSummarySchema,
  type ChatCitation,
  type ChatConversationDetail,
  type ChatConversationMessage,
  type ChatConversationSummary,
  type ChatMessagePart,
  type SourceType
} from "@syntheci/shared";
import { chatConversations, chatMessages, db } from "@syntheci/db";

export const DEFAULT_CHAT_TITLE = "New chat";

export interface ChatMetadata {
  sourceTypes?: SourceType[];
  citations?: ChatCitation[];
}

export type ChatMessage = UIMessage<ChatMetadata>;

function extractTextFromParts(parts: ChatMessagePart[]) {
  return parts
    .filter((part): part is ChatMessagePart & { text: string } => {
      return part.type === "text" && typeof part.text === "string";
    })
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMessageText(message: ChatMessage) {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("").trim();
}

export function buildAutoConversationTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return DEFAULT_CHAT_TITLE;
  }

  return normalized.length > 56 ? `${normalized.slice(0, 53).trimEnd()}...` : normalized;
}

function serializeConversationSummary(
  conversation: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  },
  latestMessage?: {
    createdAt: Date;
    parts: ChatMessagePart[];
  } | null
) {
  return chatConversationSummarySchema.parse({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    latestMessageAt: latestMessage?.createdAt.toISOString() ?? null,
    preview: latestMessage ? extractTextFromParts(latestMessage.parts).slice(0, 180) || null : null
  });
}

function serializeConversationMessage(message: {
  id: string;
  conversationId: string;
  role: ChatConversationMessage["role"];
  parts: ChatMessagePart[];
  sourceTypes: SourceType[];
  citations: ChatCitation[];
  createdAt: Date;
}) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    parts: message.parts,
    sourceTypes: message.sourceTypes.length > 0 ? message.sourceTypes : undefined,
    citations: message.citations,
    createdAt: message.createdAt.toISOString()
  } satisfies ChatConversationMessage;
}

export function toUIMessage(message: ChatConversationMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts as ChatMessage["parts"],
    metadata: {
      sourceTypes: message.sourceTypes,
      citations: message.citations
    }
  };
}

export async function listChatConversations(options: {
  workspaceId: string;
  userId: string;
  limit?: number;
}) {
  const conversations = await db.query.chatConversations.findMany({
    where: and(
      eq(chatConversations.workspaceId, options.workspaceId),
      eq(chatConversations.userId, options.userId)
    ),
    orderBy: [desc(chatConversations.updatedAt)],
    limit: options.limit ?? 40
  });

  const conversationIds = conversations.map((conversation) => conversation.id);
  const latestMessages = conversationIds.length
    ? await db.query.chatMessages.findMany({
        where: inArray(chatMessages.conversationId, conversationIds),
        orderBy: [desc(chatMessages.createdAt)]
      })
    : [];

  const firstMessageByConversation = new Map<string, (typeof latestMessages)[number]>();
  for (const message of latestMessages) {
    if (!firstMessageByConversation.has(message.conversationId)) {
      firstMessageByConversation.set(message.conversationId, message);
    }
  }

  return conversations.map((conversation) =>
    serializeConversationSummary(
      conversation,
      firstMessageByConversation.get(conversation.id)
        ? {
            createdAt: firstMessageByConversation.get(conversation.id)!.createdAt,
            parts: firstMessageByConversation.get(conversation.id)!.parts as ChatMessagePart[]
          }
        : null
    )
  ) satisfies ChatConversationSummary[];
}

export async function createChatConversation(options: {
  workspaceId: string;
  userId: string;
  title?: string;
}) {
  const [conversation] = await db
    .insert(chatConversations)
    .values({
      workspaceId: options.workspaceId,
      userId: options.userId,
      title: options.title?.trim() || DEFAULT_CHAT_TITLE
    })
    .returning();

  return serializeConversationSummary(conversation, null);
}

export async function getChatConversation(options: {
  conversationId: string;
  workspaceId: string;
  userId: string;
}) {
  const conversation = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, options.conversationId),
      eq(chatConversations.workspaceId, options.workspaceId),
      eq(chatConversations.userId, options.userId)
    )
  });

  if (!conversation) {
    return null;
  }

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversation.id),
    orderBy: [asc(chatMessages.createdAt)]
  });

  const detail = chatConversationDetailSchema.parse({
    ...serializeConversationSummary(
      conversation,
      messages.at(-1)
        ? {
            createdAt: messages.at(-1)!.createdAt,
            parts: messages.at(-1)!.parts as ChatMessagePart[]
          }
        : null
    ),
    messages: messages.map((message) =>
      serializeConversationMessage({
        ...message,
        parts: message.parts as ChatMessagePart[],
        sourceTypes: (message.sourceTypes as SourceType[]) ?? [],
        citations: (message.citations as ChatCitation[]) ?? []
      })
    )
  });

  return detail satisfies ChatConversationDetail;
}

export async function renameChatConversation(options: {
  conversationId: string;
  workspaceId: string;
  userId: string;
  title: string;
}) {
  const [conversation] = await db
    .update(chatConversations)
    .set({
      title: options.title.trim(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(chatConversations.id, options.conversationId),
        eq(chatConversations.workspaceId, options.workspaceId),
        eq(chatConversations.userId, options.userId)
      )
    )
    .returning();

  if (!conversation) {
    return null;
  }

  const latestMessage = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.conversationId, conversation.id),
    orderBy: [desc(chatMessages.createdAt)]
  });

  return serializeConversationSummary(
    conversation,
    latestMessage
      ? {
          createdAt: latestMessage.createdAt,
          parts: latestMessage.parts as ChatMessagePart[]
        }
      : null
  );
}

export async function deleteChatConversation(options: {
  conversationId: string;
  workspaceId: string;
  userId: string;
}) {
  const [deleted] = await db
    .delete(chatConversations)
    .where(
      and(
        eq(chatConversations.id, options.conversationId),
        eq(chatConversations.workspaceId, options.workspaceId),
        eq(chatConversations.userId, options.userId)
      )
    )
    .returning({ id: chatConversations.id });

  return Boolean(deleted);
}

export async function persistUserMessage(options: {
  conversationId: string;
  workspaceId: string;
  userId: string;
  message: ChatMessage;
}) {
  const conversation = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, options.conversationId),
      eq(chatConversations.workspaceId, options.workspaceId),
      eq(chatConversations.userId, options.userId)
    )
  });

  if (!conversation) {
    return null;
  }

  const firstExistingMessage = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.conversationId, options.conversationId),
    columns: { id: true }
  });

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      conversationId: options.conversationId,
      clientMessageId: options.message.id,
      role: options.message.role,
      parts: options.message.parts,
      sourceTypes: options.message.metadata?.sourceTypes ?? [],
      citations: options.message.metadata?.citations ?? []
    })
    .onConflictDoNothing({
      target: [chatMessages.conversationId, chatMessages.clientMessageId]
    })
    .returning({
      id: chatMessages.id
    });

  const promptText = getMessageText(options.message);
  const nextTitle =
    !firstExistingMessage && conversation.title === DEFAULT_CHAT_TITLE && promptText
      ? buildAutoConversationTitle(promptText)
      : conversation.title;

  await db
    .update(chatConversations)
    .set({
      title: nextTitle,
      updatedAt: new Date()
    })
    .where(eq(chatConversations.id, options.conversationId));

  if (inserted) {
    return inserted.id;
  }

  const existing = await db.query.chatMessages.findFirst({
    where: and(
      eq(chatMessages.conversationId, options.conversationId),
      eq(chatMessages.clientMessageId, options.message.id)
    ),
    columns: { id: true }
  });

  return existing?.id ?? null;
}

export async function persistAssistantMessage(options: {
  conversationId: string;
  workspaceId: string;
  userId: string;
  message: ChatMessage;
}) {
  const conversation = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, options.conversationId),
      eq(chatConversations.workspaceId, options.workspaceId),
      eq(chatConversations.userId, options.userId)
    ),
    columns: { id: true }
  });

  if (!conversation) {
    return null;
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      conversationId: options.conversationId,
      role: options.message.role,
      parts: options.message.parts,
      sourceTypes: options.message.metadata?.sourceTypes ?? [],
      citations: options.message.metadata?.citations ?? []
    })
    .returning({ id: chatMessages.id });

  await db
    .update(chatConversations)
    .set({
      updatedAt: new Date()
    })
    .where(eq(chatConversations.id, options.conversationId));

  return message?.id ?? null;
}
