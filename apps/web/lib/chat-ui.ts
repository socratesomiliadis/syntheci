import type { UIMessage } from "ai";

import type { ChatCitation, ChatConversationMessage, SourceType } from "@syntheci/shared";

export interface ChatMetadata {
  sourceTypes?: SourceType[];
  citations?: ChatCitation[];
}

export type ChatMessage = UIMessage<ChatMetadata>;

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
