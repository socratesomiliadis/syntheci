# Syntheci

Syntheci is a hackathon MVP for an AI knowledge base / second brain system:

- Better Auth + single workspace per user
- Gmail + Slack ingestion
- Upload + notes + link ingestion
- Postgres + pgvector canonical store
- MinIO file storage
- Redis + BullMQ background jobs
- AI SDK chat + triage + daily briefing + draft replies + meeting proposals

## Monorepo Structure

- `apps/web`: Next.js App Router frontend + API routes
- `apps/worker`: BullMQ worker service for ingestion, extraction, indexing, triage, briefings
- `packages/db`: Drizzle schema + migration + DB helpers
- `packages/shared`: canonical types/schemas/queue contracts
- `packages/ai`: AI SDK workflows (chat, embeddings, triage, briefing, draft, meeting extraction)

## Quick Start

1. Copy `.env.example` to `.env` and fill required secrets.
2. Install dependencies:
   - `pnpm install`
3. Start infra + services:
   - `docker compose up --build`

## Local Commands

- `pnpm dev:web`
- `pnpm dev:worker`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`

## OAuth + Webhooks

- Google connector:
  - `/api/connect/google/start`
  - `/api/connect/google/callback`
  - Gmail push webhook: `/api/webhooks/gmail?token=<GOOGLE_PUBSUB_VERIFICATION_TOKEN>`
- Slack connector:
  - `/api/connect/slack/start`
  - `/api/connect/slack/callback`
  - Slack events webhook: `/api/webhooks/slack/events`

## Data Flow

1. Connectors or manual ingestion create `messages`/`documents`.
2. Workers extract text and create `content_chunks` + embeddings.
3. Chat API performs hybrid retrieval + citation-backed answers.
4. Triage assigns one primary label + confidence.
5. Daily briefing runs from deterministic context and stores structured output.
6. Draft and meeting flows require explicit user approval before send/create.
