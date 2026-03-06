export const QUEUE_NAMES = {
  ingestion: "ingestion",
  processing: "processing",
  triage: "triage",
  briefing: "briefing",
  actions: "actions"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  INGEST_GMAIL_NOTIFICATION: "ingest-gmail-notification",
  INGEST_GMAIL_HISTORY_SYNC: "ingest-gmail-history-sync",
  RENEW_GMAIL_WATCH: "renew-gmail-watch",
  INGEST_SLACK_EVENT: "ingest-slack-event",
  PROCESS_DOCUMENT: "process-document",
  PROCESS_LINK: "process-link",
  PROCESS_NOTE: "process-note",
  TRIAGE_MESSAGE: "triage-message",
  GENERATE_BRIEFING: "generate-briefing",
  GENERATE_DRAFT_REPLY: "generate-draft-reply",
  CREATE_CALENDAR_EVENT: "create-calendar-event"
} as const;

export interface BaseJobPayload {
  workspaceId: string;
  idempotencyKey: string;
}

export interface IngestGmailNotificationPayload extends BaseJobPayload {
  connectedAccountId: string;
  historyId: string;
}

export interface IngestSlackEventPayload extends BaseJobPayload {
  sourceId: string;
  event: Record<string, unknown>;
}

export interface ProcessDocumentPayload extends BaseJobPayload {
  documentId: string;
}

export interface ProcessMessagePayload extends BaseJobPayload {
  messageId: string;
}

export interface GenerateBriefingPayload extends BaseJobPayload {
  briefingDate: string;
}

export interface GenerateDraftReplyPayload extends BaseJobPayload {
  messageId: string;
  tone?: string;
  instructions?: string;
}

export interface CreateCalendarEventPayload extends BaseJobPayload {
  proposalId: string;
}
