# Syntheci

Syntheci is a hackathon MVP for an AI knowledge base / second brain system:

- Better Auth + single workspace per user
- Gmail polling sync + Google Calendar actions
- Upload + notes + link ingestion
- Postgres + pgvector canonical store
- MinIO file storage
- Redis + BullMQ background jobs
- AI SDK chat + triage + daily briefing + draft replies + meeting proposals
- Groq + Moonshot Kimi for text/object generation, Google for embeddings

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
4. If you change any `NEXT_PUBLIC_*` variable (for example `NEXT_PUBLIC_APP_URL`), rebuild the web image:
   - `docker compose build web && docker compose up -d web`

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
  - Manual Gmail sync trigger: `/api/connectors/google/sync`

## Data Flow

1. Connectors or manual ingestion create `messages`/`documents`.
2. Workers extract text and create `content_chunks` + embeddings.
3. Chat API performs hybrid retrieval + citation-backed answers.
4. Triage assigns one primary label + confidence.
5. Daily briefing runs from deterministic context and stores structured output.
6. Draft and meeting flows require explicit user approval before send/create.
