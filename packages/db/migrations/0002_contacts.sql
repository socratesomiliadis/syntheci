DO $$
BEGIN
  ALTER TYPE source_type ADD VALUE IF NOT EXISTS 'contact';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text,
  email text,
  phone_number text,
  company text,
  role text,
  notes text,
  origin text NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS contacts_workspace_id_idx ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
CREATE INDEX IF NOT EXISTS contacts_last_message_at_idx ON contacts(last_message_at DESC);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_contact_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_contact_id_contacts_id_fk'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_sender_contact_id_contacts_id_fk
      FOREIGN KEY (sender_contact_id)
      REFERENCES contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS messages_sender_contact_id_idx ON messages(sender_contact_id);

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS contact_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_contact_id_contacts_id_fk'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_contact_id_contacts_id_fk
      FOREIGN KEY (contact_id)
      REFERENCES contacts(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_contact_unique'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_contact_unique UNIQUE(contact_id);
  END IF;
END $$;
