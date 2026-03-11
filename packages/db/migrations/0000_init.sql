CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
    CREATE TYPE source_type AS ENUM ('gmail', 'note', 'upload', 'link');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE membership_role AS ENUM ('owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'triage_label') THEN
    CREATE TYPE triage_label AS ENUM ('urgent', 'needs_reply', 'follow_up', 'scheduling', 'informational');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_reply_status') THEN
    CREATE TYPE draft_reply_status AS ENUM ('generated', 'approved', 'sent', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_proposal_status') THEN
    CREATE TYPE meeting_proposal_status AS ENUM ('proposed', 'approved', 'created', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  "expiresAt" timestamptz NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL,
  UNIQUE("providerId", "accountId")
);

CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz,
  "updatedAt" timestamptz,
  nonce text
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);
CREATE INDEX IF NOT EXISTS verification_value_idx ON "verification"(value);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_user_id_idx ON workspaces(owner_user_id);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_workspace_id_idx ON memberships(workspace_id);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);

CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, external_account_id)
);

CREATE INDEX IF NOT EXISTS connected_accounts_workspace_id_idx ON connected_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS connected_accounts_user_id_idx ON connected_accounts(user_id);

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connected_account_id uuid REFERENCES connected_accounts(id) ON DELETE SET NULL,
  type source_type NOT NULL,
  external_source_id text,
  display_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_workspace_id_idx ON sources(workspace_id);
CREATE INDEX IF NOT EXISTS sources_connected_account_id_idx ON sources(connected_account_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_message_id text NOT NULL,
  external_thread_id text,
  sender_name text,
  sender_email text,
  subject text,
  text_body text NOT NULL,
  html_body text,
  deep_link text,
  received_at timestamptz NOT NULL,
  is_unread boolean NOT NULL DEFAULT true,
  is_open_thread boolean NOT NULL DEFAULT true,
  raw_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, external_message_id)
);

CREATE INDEX IF NOT EXISTS messages_workspace_id_idx ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS messages_source_id_idx ON messages(source_id);
CREATE INDEX IF NOT EXISTS messages_received_at_idx ON messages(received_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  mime_type text,
  object_key text,
  external_url text,
  note_body text,
  raw_text text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_workspace_id_idx ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS documents_source_id_idx ON documents(source_id);

CREATE TABLE IF NOT EXISTS content_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  content text NOT NULL,
  token_count integer NOT NULL,
  embedding vector(1536) NOT NULL,
  rank_boost double precision NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_chunks_workspace_id_idx ON content_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS content_chunks_source_id_idx ON content_chunks(source_id);
CREATE INDEX IF NOT EXISTS content_chunks_document_id_idx ON content_chunks(document_id);
CREATE INDEX IF NOT EXISTS content_chunks_message_id_idx ON content_chunks(message_id);
CREATE INDEX IF NOT EXISTS content_chunks_embedding_idx ON content_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS content_chunks_content_trgm_idx ON content_chunks USING gin (content gin_trgm_ops);

CREATE TABLE IF NOT EXISTS triage_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE UNIQUE,
  label triage_label NOT NULL,
  confidence double precision NOT NULL,
  rationale text NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS triage_results_workspace_id_idx ON triage_results(workspace_id);
CREATE INDEX IF NOT EXISTS triage_results_label_idx ON triage_results(label);

CREATE TABLE IF NOT EXISTS draft_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tone text,
  instructions text,
  body text NOT NULL,
  status draft_reply_status NOT NULL DEFAULT 'generated',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS draft_replies_workspace_id_idx ON draft_replies(workspace_id);
CREATE INDEX IF NOT EXISTS draft_replies_message_id_idx ON draft_replies(message_id);
CREATE INDEX IF NOT EXISTS draft_replies_status_idx ON draft_replies(status);

CREATE TABLE IF NOT EXISTS meeting_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  timezone text NOT NULL DEFAULT 'UTC',
  starts_at timestamptz,
  ends_at timestamptz,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  status meeting_proposal_status NOT NULL DEFAULT 'proposed',
  external_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_proposals_workspace_id_idx ON meeting_proposals(workspace_id);
CREATE INDEX IF NOT EXISTS meeting_proposals_status_idx ON meeting_proposals(status);

CREATE TABLE IF NOT EXISTS briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  summary text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS briefings_workspace_id_idx ON briefings(workspace_id);
CREATE INDEX IF NOT EXISTS briefings_briefing_date_idx ON briefings(briefing_date DESC);

CREATE TABLE IF NOT EXISTS jobs_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  queue_name text NOT NULL,
  job_name text NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(queue_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS jobs_audit_workspace_id_idx ON jobs_audit(workspace_id);
CREATE INDEX IF NOT EXISTS jobs_audit_status_idx ON jobs_audit(status);
