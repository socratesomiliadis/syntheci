export type SourceType = "gmail" | "note" | "upload" | "link" | "contact";

export type ChatMessageRole = "user" | "assistant" | "system";

export type TriageLabel =
  | "urgent"
  | "needs_reply"
  | "follow_up"
  | "scheduling"
  | "informational";

export type DraftReplyStatus = "generated" | "approved" | "sent" | "failed";

export type MeetingProposalStatus =
  | "proposed"
  | "approved"
  | "created"
  | "rejected";

export type BriefingItemType = "priority" | "todo" | "meeting" | "followup";

export interface ChatCitation {
  sourceType: SourceType;
  sourceId: string;
  messageOrDocId: string;
  snippet: string;
  startOffset: number;
  endOffset: number;
  deepLink: string | null;
}

export interface ChatMessagePart {
  type: string;
  [key: string]: unknown;
}

export interface ChatSourceFilters {
  sourceTypes?: SourceType[];
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  latestMessageAt: string | null;
  preview: string | null;
}

export interface ChatConversationMessage {
  id: string;
  conversationId: string;
  role: ChatMessageRole;
  parts: ChatMessagePart[];
  sourceTypes?: SourceType[];
  citations: ChatCitation[];
  createdAt: string;
}

export interface ChatConversationDetail extends ChatConversationSummary {
  messages: ChatConversationMessage[];
}

export interface BriefingItem {
  type: BriefingItemType;
  title: string;
  reason: string;
  sourceRefs: Array<{
    sourceType: SourceType;
    sourceId: string;
    messageOrDocId: string;
  }>;
}

export interface ChatAnswer {
  answer: string;
  citations: ChatCitation[];
}

export interface TriageResult {
  label: TriageLabel;
  confidence: number;
  rationale: string;
}
