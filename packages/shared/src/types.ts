export type SourceType = "gmail" | "note" | "upload" | "link";

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
