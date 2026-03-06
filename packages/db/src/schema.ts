import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", [
  "gmail",
  "slack",
  "note",
  "upload",
  "link"
]);

export const membershipRoleEnum = pgEnum("membership_role", ["owner"]);

export const triageLabelEnum = pgEnum("triage_label", [
  "urgent",
  "needs_reply",
  "follow_up",
  "scheduling",
  "informational"
]);

export const draftReplyStatusEnum = pgEnum("draft_reply_status", [
  "generated",
  "approved",
  "sent",
  "failed"
]);

export const meetingProposalStatusEnum = pgEnum("meeting_proposal_status", [
  "proposed",
  "approved",
  "created",
  "rejected"
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const authUsers = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull()
});

export const authSessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull()
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const authAccounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull()
  },
  (table) => [
    unique("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId)
  ]
);

export const authVerifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }),
    updatedAt: timestamp("updatedAt", { withTimezone: true }),
    nonce: text("nonce")
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_value_idx").on(table.value)
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("workspaces_owner_user_id_idx").on(table.ownerUserId)]
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("memberships_workspace_user_unique").on(table.workspaceId, table.userId),
    index("memberships_workspace_id_idx").on(table.workspaceId),
    index("memberships_user_id_idx").on(table.userId)
  ]
);

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    scopes: text("scopes").array().notNull().default([]),
    accessTokenCiphertext: text("access_token_ciphertext").notNull(),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("connected_accounts_provider_external_unique").on(
      table.provider,
      table.externalAccountId
    ),
    index("connected_accounts_workspace_id_idx").on(table.workspaceId),
    index("connected_accounts_user_id_idx").on(table.userId)
  ]
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectedAccountId: uuid("connected_account_id").references(
      () => connectedAccounts.id,
      { onDelete: "set null" }
    ),
    type: sourceTypeEnum("type").notNull(),
    externalSourceId: text("external_source_id"),
    displayName: text("display_name").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("sources_workspace_id_idx").on(table.workspaceId),
    index("sources_connected_account_id_idx").on(table.connectedAccountId)
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalMessageId: text("external_message_id").notNull(),
    externalThreadId: text("external_thread_id"),
    senderName: text("sender_name"),
    senderEmail: text("sender_email"),
    subject: text("subject"),
    textBody: text("text_body").notNull(),
    htmlBody: text("html_body"),
    deepLink: text("deep_link"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    isUnread: boolean("is_unread").notNull().default(true),
    isOpenThread: boolean("is_open_thread").notNull().default(true),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("messages_source_external_unique").on(table.sourceId, table.externalMessageId),
    index("messages_workspace_id_idx").on(table.workspaceId),
    index("messages_source_id_idx").on(table.sourceId),
    index("messages_received_at_idx").on(table.receivedAt)
  ]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    mimeType: text("mime_type"),
    objectKey: text("object_key"),
    externalUrl: text("external_url"),
    noteBody: text("note_body"),
    rawText: text("raw_text").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("documents_workspace_id_idx").on(table.workspaceId),
    index("documents_source_id_idx").on(table.sourceId)
  ]
);

export const contentChunks = pgTable(
  "content_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    rankBoost: doublePrecision("rank_boost").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("content_chunks_workspace_id_idx").on(table.workspaceId),
    index("content_chunks_source_id_idx").on(table.sourceId),
    index("content_chunks_document_id_idx").on(table.documentId),
    index("content_chunks_message_id_idx").on(table.messageId)
  ]
);

export const triageResults = pgTable(
  "triage_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    label: triageLabelEnum("label").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    rationale: text("rationale").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("triage_results_message_unique").on(table.messageId),
    index("triage_results_workspace_id_idx").on(table.workspaceId),
    index("triage_results_label_idx").on(table.label)
  ]
);

export const draftReplies = pgTable(
  "draft_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    tone: text("tone"),
    instructions: text("instructions"),
    body: text("body").notNull(),
    status: draftReplyStatusEnum("status").notNull().default("generated"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("draft_replies_workspace_id_idx").on(table.workspaceId),
    index("draft_replies_message_id_idx").on(table.messageId),
    index("draft_replies_status_idx").on(table.status)
  ]
);

export const meetingProposals = pgTable(
  "meeting_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceMessageId: uuid("source_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    timezone: text("timezone").notNull().default("UTC"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    attendees: jsonb("attendees").notNull().default([]),
    status: meetingProposalStatusEnum("status").notNull().default("proposed"),
    externalEventId: text("external_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("meeting_proposals_workspace_id_idx").on(table.workspaceId),
    index("meeting_proposals_status_idx").on(table.status)
  ]
);

export const briefings = pgTable(
  "briefings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    briefingDate: date("briefing_date").notNull(),
    summary: text("summary").notNull(),
    items: jsonb("items").notNull().default([]),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("briefings_workspace_date_unique").on(table.workspaceId, table.briefingDate),
    index("briefings_workspace_id_idx").on(table.workspaceId),
    index("briefings_briefing_date_idx").on(table.briefingDate)
  ]
);

export const jobsAudit = pgTable(
  "jobs_audit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    queueName: text("queue_name").notNull(),
    jobName: text("job_name").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    payload: jsonb("payload").notNull().default({}),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("jobs_audit_queue_idempotency_unique").on(table.queueName, table.idempotencyKey),
    index("jobs_audit_workspace_id_idx").on(table.workspaceId),
    index("jobs_audit_status_idx").on(table.status)
  ]
);
