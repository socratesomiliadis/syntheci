> [!IMPORTANT]
> This project was created for the Netcompany Hackathon 2026.
> It is intentionally MVP-shaped: ambitious, end-to-end, and optimized for demoability, speed, and product clarity over production-hardening.

<div align="center">

# Syntheci

### An AI workspace for turning scattered operational context into action

<p>
  <img alt="Hackathon" src="https://img.shields.io/badge/Netcompany-Hackathon%202026-0f172a?style=for-the-badge">
  <img alt="Monorepo" src="https://img.shields.io/badge/Monorepo-pnpm-f59e0b?style=for-the-badge">
  <img alt="Frontend" src="https://img.shields.io/badge/Frontend-Next.js%2016-111827?style=for-the-badge">
  <img alt="Workers" src="https://img.shields.io/badge/Jobs-BullMQ-2563eb?style=for-the-badge">
  <img alt="Database" src="https://img.shields.io/badge/Database-Postgres%20%2B%20pgvector-0ea5e9?style=for-the-badge">
</p>

<p>
  <img alt="Storage" src="https://img.shields.io/badge/Object%20Storage-MinIO-059669?style=flat-square">
  <img alt="Auth" src="https://img.shields.io/badge/Auth-Better%20Auth-7c3aed?style=flat-square">
  <img alt="AI SDK" src="https://img.shields.io/badge/AI-AI%20SDK-c2410c?style=flat-square">
  <img alt="Embeddings" src="https://img.shields.io/badge/Embeddings-Google-1d4ed8?style=flat-square">
  <img alt="Generation" src="https://img.shields.io/badge/Generation-Groq%20%2B%20Kimi-111827?style=flat-square">
</p>

</div>

Syntheci is an AI workspace for turning scattered operational context into an actionable system.

It combines:

- a priority inbox
- a grounded knowledge chat with citations
- note, link, and file ingestion
- contact enrichment
- daily briefings
- approval-driven email drafting
- approval-driven meeting creation

All of that runs inside a pnpm monorepo built with Next.js, BullMQ, Postgres + pgvector, Redis, MinIO, Better Auth, and the AI SDK.

---

## At a glance

<table>
  <tr>
    <td valign="top" width="33%">
      <strong>What it feels like</strong><br>
      A second brain for operational work: triage what matters, ask grounded questions, approve the right actions, and keep context in one place.
    </td>
    <td valign="top" width="33%">
      <strong>What powers it</strong><br>
      Next.js, Better Auth, Drizzle, Postgres + pgvector, Redis, BullMQ, MinIO, Groq, and Google embeddings.
    </td>
    <td valign="top" width="33%">
      <strong>What makes it interesting</strong><br>
      Shared canonical storage, queue-backed ingestion, citation-based chat, and approval-driven automation all in one stack.
    </td>
  </tr>
</table>

## Core capabilities

<table>
  <tr>
    <td valign="top" width="50%">
      <strong>Inbox and prioritization</strong><br>
      Gmail sync, triage labels, ranking logic, sender enrichment, and action-oriented inbox review.
    </td>
    <td valign="top" width="50%">
      <strong>Knowledge and retrieval</strong><br>
      Two-stage hybrid retrieval across messages, notes, links, uploads, and synthesized contact knowledge, with reranking for stronger evidence diversity.
    </td>
  </tr>
  <tr>
    <td valign="top" width="50%">
      <strong>Human-in-the-loop automation</strong><br>
      Draft replies and meeting proposals are generated quickly, but external side effects stay approval-gated.
    </td>
    <td valign="top" width="50%">
      <strong>Demo-ready end-to-end experience</strong><br>
      Seeded workspace, seeded data, seeded chat history, and seeded meetings make the product immediately explorable.
    </td>
  </tr>
</table>

## Table of Contents

- [Why Syntheci exists](#why-syntheci-exists)
- [What the product does](#what-the-product-does)
- [System architecture](#system-architecture)
- [End-to-end flows](#end-to-end-flows)
- [Repository structure](#repository-structure)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Developer commands](#developer-commands)
- [Benchmarking and evaluation](#benchmarking-and-evaluation)
- [Important code highlights](#important-code-highlights)
- [Data model](#data-model)
- [API surface](#api-surface)
- [Testing](#testing)
- [Operational notes](#operational-notes)
- [Current MVP constraints](#current-mvp-constraints)

## Why Syntheci exists

Most work does not fail because information is unavailable. It fails because information is fragmented across email threads, notes, uploaded docs, links, calendar context, and human memory.

Syntheci is designed to act like a second operational brain:

- ingest what matters
- normalize it into a canonical store
- rank what needs attention
- answer questions with evidence
- propose actions
- require explicit human approval before high-impact sends or calendar creation

The result is a workspace that is useful both as a demoable hackathon MVP and as a serious architecture for retrieval, triage, and approval-based automation.

> [!TIP]
> If you want the fastest path to seeing the product, use the seeded demo login after running the bootstrap flow. The demo workspace already contains messages, notes, links, files, briefings, meetings, contacts, and saved chat threads.

## What the product does

### 1. Authentication and workspace bootstrap

- Better Auth powers sign-in and session handling.
- Every authenticated user gets a workspace automatically.
- A demo account can be bootstrapped and signed into without connecting a real Google account.

### 2. Gmail sync and priority inbox

- Users can connect Google accounts for Gmail + Calendar access.
- Gmail sync imports inbox messages, stores canonical message records, and indexes them for retrieval.
- Each imported message is triaged into one label:
  - `urgent`
  - `needs_reply`
  - `follow_up`
  - `scheduling`
  - `informational`
- The inbox UI ranks messages using label weight, unread state, and confidence.

### 3. Contact graph and contact knowledge

- Incoming email senders are turned into contact records.
- Contacts are also converted into synthetic knowledge documents and embedded into the retrieval system.
- That means chat can answer questions about people, not just messages and documents.

### 4. Ingestion pipeline

Syntheci can ingest three non-email document sources:

- notes
- links
- uploaded files

Each path ends in the same outcome:

1. store a canonical `document`
2. extract or normalize text
3. chunk the text
4. generate embeddings
5. write `content_chunks`

The ingestion dashboard now also includes a searchable document library for browsing notes, links, and uploads in one place.

### 5. Grounded chat with citations

- Chat uses retrieval-augmented generation over `content_chunks`.
- Retrieval now uses a two-stage pipeline: broad hybrid candidate fetch in Postgres, then intent-aware reranking that improves evidence diversity across emails and documents.
- Conversations are persisted.
- Assistant responses include citations back to the underlying message or document.

### 6. Daily briefings

- A worker scheduler checks workspaces regularly.
- At 09:00 local workspace time, it queues a daily briefing if one has not already been generated for that day.
- Briefings summarize urgent items, follow-ups, open threads, and near-term meetings.

### 7. Draft Center

- Draft replies can be generated from inbox messages.
- Drafts are intentionally approval-driven:
  - `generated`
  - `approved`
  - `sent`
  - `failed`
- Nothing is sent until the user explicitly approves it.

### 8. Meeting Center

- Scheduling intent can be extracted from messages.
- Meeting proposals are persisted and can be edited.
- Proposals also follow an approval state machine:
  - `proposed`
  - `approved`
  - `created`
  - `rejected`
- Calendar events are only created after approval.

### 9. Demo mode

The repo ships with a strong seeded demo experience:

- demo auth user
- demo Gmail connector
- demo messages
- demo contacts
- demo notes
- demo links
- demo uploads
- demo briefings
- demo meetings
- demo chat history

This makes the system reviewable end-to-end even without real Google credentials.

## System architecture

<p align="center">
  <em>One application layer, one canonical workspace store, one retrieval substrate, and multiple human-approved action paths.</em>
</p>

```mermaid
flowchart LR
    User["User"] --> Web["Next.js Web App"]
    Web --> Auth["Better Auth"]
    Web --> API["Route Handlers / API"]
    API --> DB["Postgres + pgvector"]
    API --> Redis["Redis / BullMQ"]
    API --> MinIO["MinIO Object Storage"]
    API --> Google["Google APIs"]
    API --> AI["AI SDK + Groq + Google Embeddings"]

    Redis --> Worker["Worker Service"]
    Worker --> DB
    Worker --> MinIO
    Worker --> Google
    Worker --> AI
```

### Runtime responsibilities

| Layer | Responsibility |
| --- | --- |
| `apps/web` | UI, auth, route handlers, queue producers, retrieval, action APIs |
| `apps/worker` | background processing, extraction, indexing, Gmail sync, briefings, scheduler |
| `packages/db` | schema, Drizzle client, migrations, DB helpers |
| `packages/ai` | chat, embeddings, triage, briefing, draft, meeting extraction |
| `packages/evals` | benchmark cases, scoring, report generation, and the live benchmark CLI |
| `packages/shared` | shared schemas, queue contracts, demo fixtures, constants |

## End-to-end flows

<details>
<summary><strong>How to read the flows</strong></summary>

These diagrams are meant to show the product as a system, not just as isolated API routes:

- ingestion turns raw inputs into canonical data plus embeddings
- sync jobs turn external systems into internal workspace knowledge
- chat reuses the same retrieval substrate as briefs and action generation
- high-impact actions stay behind explicit approval state transitions

</details>

### Ingestion flow

```mermaid
flowchart TD
    A["User adds note / link / file"] --> B["API route creates document record"]
    B --> C["Queue processing job with idempotency key"]
    C --> D["Worker picks up job"]
    D --> E{"Source type"}
    E -->|Note| F["Use note body as raw text"]
    E -->|Link| G["Fetch URL + Readability extraction"]
    E -->|Upload| H["Read object from MinIO + parse PDF/text"]
    F --> I["Chunk text"]
    G --> I
    H --> I
    I --> J["Generate embeddings"]
    J --> K["Write content_chunks"]
    K --> L["Available to chat and retrieval"]
```

### Gmail sync, triage, and contact enrichment

```mermaid
flowchart TD
    A["Google connector"] --> B["Queue sync job"]
    B --> C["Worker loads Gmail messages"]
    C --> D["Persist messages"]
    D --> E["Create or update sender contact"]
    E --> F["Sync contact knowledge document"]
    D --> G["Chunk + embed message text"]
    D --> H["Classify triage label"]
    H --> I["Priority Inbox"]
    G --> J["Knowledge Chat"]
```

### Chat retrieval sequence

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant R as Retrieval
    participant A as AI Layer
    participant D as Database

    U->>W: Send question
    W->>D: Persist user message
    W->>R: Retrieve context chunks
    R->>A: Embed query
    R->>D: Run hybrid retrieval SQL
    D-->>R: Ranked chunks
    R-->>W: Context chunks
    W->>A: Stream grounded answer
    A-->>W: Answer + citations
    W->>D: Persist assistant message
    W-->>U: Streamed response
```

### Approval-driven action model

```mermaid
flowchart LR
    subgraph Drafts
        D1["generated"] -->|approve| D2["approved"]
        D2 -->|send| D3["sent"]
        D2 -->|send failure| D4["failed"]
    end

    subgraph Meetings
        M1["proposed"] -->|approve| M2["approved"]
        M2 -->|create calendar event| M3["created"]
    end
```

### Daily scheduler flow

```mermaid
flowchart LR
    Sweep["Scheduler sweep every 5 min"] --> Briefings["Queue due daily briefings"]
    Sweep --> Gmail["Queue Gmail poll sync"]
    Briefings --> Worker["Briefing worker"]
    Gmail --> Worker2["Ingestion worker"]
    Worker --> DB["briefings table"]
    Worker2 --> DB2["messages / triage / content_chunks"]
```

## Repository structure

<p align="center">
  <em>Web app for orchestration and UX, worker for background execution, shared packages for contracts and intelligence.</em>
</p>

```text
.
|-- apps
|   |-- web
|   |   |-- app
|   |   |   |-- api
|   |   |   |-- dashboard
|   |   |   `-- login
|   |   |-- components
|   |   `-- lib
|   `-- worker
|       `-- src
|           |-- services
|           `-- utils
|-- packages
|   |-- ai
|   |-- db
|   |-- evals
|   `-- shared
|-- docker-compose.yml
|-- package.json
`-- pnpm-workspace.yaml
```

## Tech stack

<table>
  <tr>
    <td valign="top" width="25%"><strong>Frontend</strong><br>Next.js 16, React 19, Tailwind 4, Motion</td>
    <td valign="top" width="25%"><strong>Auth</strong><br>Better Auth</td>
    <td valign="top" width="25%"><strong>Data</strong><br>Postgres, pgvector, Drizzle</td>
    <td valign="top" width="25%"><strong>Infra</strong><br>Redis, BullMQ, MinIO, Docker</td>
  </tr>
</table>

### Frontend and application layer

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Motion
- shadcn/base-ui primitives
- AI SDK / `@ai-sdk/react`

### Backend and infrastructure

- Better Auth
- Drizzle ORM
- PostgreSQL + pgvector
- Redis
- BullMQ
- MinIO
- Docker Compose

### AI providers

- Groq for text/object generation
- Moonshot Kimi model via Groq for chat-style tasks
- Google embeddings for vector search

## Getting started

> [!NOTE]
> There are two good ways to run the project locally:
> `compose:up` for a mostly containerized experience, or `compose:dev` plus local web/worker processes for a faster development loop.

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop or compatible Docker runtime

### Option A: full Docker startup

This is the easiest path if you want the whole stack running in containers.

For this mode, the app and worker run inside Docker, so infra hosts should use
the Compose service names:

- `DATABASE_URL=postgres://syntheci:syntheci@postgres:5432/syntheci`
- `REDIS_URL=redis://redis:6379`
- `MINIO_ENDPOINT=http://minio:9000`

That is why the checked-in `.env.example` is container-oriented by default.

```bash
pnpm install
cp .env.example .env
pnpm compose:up
```

Open:

- App: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

### Option B: local app + worker, Docker infra only

This is the nicest developer loop when editing code.

For this mode, Docker still runs Postgres, Redis, and MinIO, but `apps/web` and
`apps/worker` run on your machine. That means the local Node processes must use
`localhost`, not the Docker service names:

```env
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
```

If you copy `.env.example`, update those values before starting `dev:web` and
`dev:worker`.

```bash
pnpm install
cp .env.example .env
pnpm compose:dev
pnpm dev:web
pnpm dev:worker
```

`compose:dev` starts:

- Postgres
- Redis
- MinIO
- MinIO bucket initialization
- demo bootstrap

Then you run the web app and worker locally.

### Demo login

With `DEMO_MODE_ENABLED=true`, the login page exposes a demo sign-in flow that authenticates into the seeded workspace.

Default demo credentials:

- Email: `demo@syntheci.local`
- Password: `demo-password-123`

In the UI, you can simply click `Use demo account`.

> [!TIP]
> The demo path is the best way to understand the full product shape quickly because it exercises chat, ingestion, contacts, inbox, drafts, meetings, and briefings without needing real Google data.

### Rebuilding after public env changes

If you change a `NEXT_PUBLIC_*` variable such as `NEXT_PUBLIC_APP_URL`, rebuild the web image:

```bash
docker compose build web
docker compose up -d web
```

## Environment variables

<details>
<summary><strong>Why the env surface is larger than a typical app</strong></summary>

Syntheci is not just a web UI. It spans:

- OAuth
- worker queues
- object storage
- embeddings
- text generation
- demo bootstrap

That means the environment is configuring both product behavior and infrastructure behavior.

</details>

The root `.env.example` is already a good source of truth. The table below explains what each variable actually controls.

### Hostname rule of thumb

- If `web` and `worker` are running in Docker, use Docker hostnames like
  `postgres`, `redis`, and `minio`.
- If `web` and `worker` are running on your machine, use `localhost` for those
  same services.

### Common env presets

#### Full Docker startup: app + worker in containers

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://syntheci:syntheci@postgres:5432/syntheci
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_URL=http://localhost:9000
```

#### Docker infra only: app + worker running locally

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
```

> [!IMPORTANT]
> The most common local startup bug is keeping `postgres`, `redis`, or `minio`
> in `.env` while running `pnpm dev:web` or `pnpm dev:worker` outside Docker.
> Those hostnames only resolve from inside the Docker network.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode |
| `NEXT_PUBLIC_APP_URL` | Public frontend URL baked into the Next.js app |
| `APP_BASE_URL` | Server-side base URL for OAuth callbacks and internal references |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string for BullMQ |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint |
| `MINIO_REGION` | MinIO region |
| `MINIO_ACCESS_KEY` | MinIO access key |
| `MINIO_SECRET_KEY` | MinIO secret key |
| `MINIO_BUCKET` | Bucket for uploaded assets |
| `MINIO_PUBLIC_URL` | Public URL used when generating object links |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth and encryption helpers |
| `BETTER_AUTH_URL` | Better Auth base URL |
| `DEMO_MODE_ENABLED` | Enables demo login and bootstrap behavior |
| `DEMO_ACCOUNT_EMAIL` | Demo auth email |
| `DEMO_ACCOUNT_PASSWORD` | Demo auth password |
| `DEMO_ACCOUNT_NAME` | Demo user display name |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALENDAR_SCOPES` | Additional calendar scopes configuration |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key for embeddings |
| `GOOGLE_EMBEDDING_MODEL` | Embedding model name |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_CHAT_MODEL` | Chat/object generation model |
| `WORKER_CONCURRENCY` | Worker concurrency for BullMQ workers |

### Notes

- `BETTER_AUTH_SECRET` should be long and random. The code validates a minimum length of 20.
- Google sign-in and Google connector flows both depend on valid OAuth setup.
- MinIO is used as S3-compatible object storage for uploads.

## Developer commands

### Root commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm benchmark
pnpm db:migrate
pnpm db:generate
pnpm compose:up
pnpm compose:dev
pnpm compose:down
```

### Useful URLs

- `/login`
- `/dashboard`
- `/dashboard/chat`
- `/dashboard/inbox`
- `/dashboard/ingestion`
- `/dashboard/drafts`
- `/dashboard/meetings`
- `/api/health`
- `/api/connectors/health`

## Benchmarking and evaluation

Syntheci includes a dedicated benchmark harness in `packages/evals` and a root command:

```bash
pnpm benchmark
```

What it does:

- verifies the required AI, database, and storage dependencies
- reseeds the demo workspace into a known state
- imports the remaining demo sync batches
- runs objective suites for retrieval, citation grounding, structured multi-document conclusions, triage, briefing generation, and meeting extraction
- writes machine-readable and Markdown reports to `benchmark-reports/<timestamp>/`

Artifacts generated per run:

- `benchmark-report.json`
- `benchmark-report.md`
- `benchmark-summary.md`

### Current benchmark snapshot

Latest validated run:

- Date: **March 15, 2026**
- Timestamp: `2026-03-15T19:39:26.768Z`
- Dataset: `Syntheci Demo Workspace benchmark v1`
- Reports: [benchmark-reports/2026-03-15T19-39-26-768Z](D:\Projects\playground\syntheci\benchmark-reports\2026-03-15T19-39-26-768Z)

| Metric | Result |
| --- | ---: |
| Retrieval Recall@5 | 80.0% |
| Retrieval MRR | 80.0% |
| Citation precision | 62.5% |
| Citation coverage | 100.0% |
| Multi-document conclusion accuracy | 100.0% |
| Single-document conclusion accuracy | 100.0% |
| Triage accuracy | 81.8% |
| Briefing item recall | 66.7% |
| Briefing priority coverage | 100.0% |
| Meeting intent accuracy | 100.0% |
| Meeting time exact-match rate | 100.0% |
| Retrieval latency (median / p95) | 289 ms / 298 ms |
| Structured chat latency (median / p95) | 649 ms / 708 ms |
| Triage latency (median / p95) | 0 ms / 408 ms |
| Meeting extraction latency (median / p95) | 456 ms / 484 ms |

### Why these numbers are useful

- They are objective and quote-safe: the benchmark uses seeded gold cases and deterministic scoring rather than subjective LLM judging.
- They are reproducible: each run resets the workspace, imports the same demo corpus, and emits traceable artifacts.
- They now reflect the improved retrieval stack, including the new reranking layer that materially improved retrieval and citation grounding.

## Important code highlights

These are some of the most important pieces of logic in the repo.

<p align="center">
  <em>These snippets are the real "why this architecture works" moments in the codebase.</em>
</p>

### 1. New users automatically get a workspace

Syntheci treats workspace creation as part of authentication, not a separate setup step.

```ts
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        await ensureWorkspaceForUser({
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          image: user.image
        });
      }
    }
  }
}
```

Why it matters:

- eliminates post-signup setup friction
- guarantees every session can resolve to a workspace
- keeps downstream APIs simple because they can assume workspace context exists

### 2. Retrieval is hybrid and reranked, not pure vector search

The retrieval layer now works in two phases:

1. fetch a broader candidate set using embeddings, PostgreSQL full-text ranking, and source boosts
2. rerank those candidates with intent-aware logic and source diversity so the final context is less email-heavy and more evidentially useful

```ts
const candidates = result.rows.map((row) => ({
  sourceType: row.source_type,
  messageOrDocId: row.message_or_doc_id,
  content: row.content,
  score: Number(row.score)
}));

return rerankRetrievedChunks(candidates, profile, limit);
```

Why it matters:

- vector similarity alone is often weak for operational text
- broad candidate recall is not enough if the final context is dominated by one source type
- reranking helps surface uploads, links, and notes that materially improve grounded answers

### 3. Contacts become retrieval-ready knowledge

Contacts are not just metadata rows. They are turned into synthetic documents and embedded.

```ts
const rawText = buildContactProfileText(input.contact);
const [embedding] = await embedTexts([rawText]);
await db.insert(contentChunks).values({
  workspaceId: input.workspaceId,
  sourceId: input.sourceId,
  documentId: document.id,
  content: rawText,
  tokenCount: estimateTokenCount(rawText),
  embedding,
  rankBoost: 1.2
});
```

Why it matters:

- chat can answer people-centric questions
- contacts and documents share the same retrieval substrate
- the contact graph becomes part of the knowledge base automatically

### 4. Action execution is guarded by explicit approval

Draft replies cannot be sent unless they are already approved.

```ts
if (draft.status !== "approved") {
  return NextResponse.json(
    { error: "draft must be approved before send" },
    { status: 400 }
  );
}
```

Meeting proposals use the same pattern before calendar creation.

Why it matters:

- keeps the product assistive instead of fully autonomous
- reduces accidental external side effects
- makes the approval trail explicit in the database

### 5. Queue jobs are idempotent and audited

Jobs are tracked with deterministic keys and an audit table.

```ts
await params.queue.add(params.name, params.payload, {
  jobId: params.payload.idempotencyKey,
  removeOnComplete: 500,
  removeOnFail: 2000,
  attempts: 4,
  backoff: {
    type: "exponential",
    delay: 2000
  }
});
```

Why it matters:

- duplicate work is easier to avoid
- failures become inspectable
- retries are safe and intentional

### 6. Daily briefing generation is time-zone aware

The scheduler only queues a briefing when the workspace is at 09:00 local time and one has not already been generated.

```ts
const hour = getHourInTimezone(now, workspace.timezone);
if (hour !== 9) continue;

const briefingDate = formatDateInTimezone(now, workspace.timezone);
const existing = await db.query.briefings.findFirst({
  where: and(
    eq(briefings.workspaceId, workspace.id),
    eq(briefings.briefingDate, briefingDate)
  )
});
if (existing) continue;
```

Why it matters:

- prevents duplicate daily briefs
- preserves the mental model of "my morning briefing"
- shows the worker is not just reactive, it is also scheduled

### 7. The repo includes a real benchmark harness

The evaluation suite runs against a freshly seeded workspace and emits JSON plus Markdown reports that are suitable for README and pitch material.

```bash
pnpm benchmark
```

Why it matters:

- improvements can be measured instead of guessed
- quoted metrics are tied to concrete timestamped reports
- regressions in retrieval, grounding, or automation quality become visible early

## Data model

At a high level, the system revolves around a canonical workspace store.

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : belongs_to
    WORKSPACES ||--o{ MEMBERSHIPS : has
    WORKSPACES ||--o{ CONNECTED_ACCOUNTS : owns
    WORKSPACES ||--o{ SOURCES : has
    WORKSPACES ||--o{ CONTACTS : has
    WORKSPACES ||--o{ MESSAGES : has
    WORKSPACES ||--o{ DOCUMENTS : has
    WORKSPACES ||--o{ TRIAGE_RESULTS : has
    WORKSPACES ||--o{ DRAFT_REPLIES : has
    WORKSPACES ||--o{ MEETING_PROPOSALS : has
    WORKSPACES ||--o{ BRIEFINGS : has
    WORKSPACES ||--o{ CHAT_CONVERSATIONS : has

    SOURCES ||--o{ MESSAGES : produces
    SOURCES ||--o{ DOCUMENTS : produces
    DOCUMENTS ||--o{ CONTENT_CHUNKS : splits_into
    MESSAGES ||--o{ CONTENT_CHUNKS : splits_into
    MESSAGES ||--|| TRIAGE_RESULTS : classified_as
    MESSAGES ||--o{ DRAFT_REPLIES : drafts
    MESSAGES ||--o{ MEETING_PROPOSALS : suggests
    CHAT_CONVERSATIONS ||--o{ CHAT_MESSAGES : contains
```

### Key tables

| Table | Role |
| --- | --- |
| `workspaces` | tenant boundary |
| `connected_accounts` | OAuth-backed external identities |
| `sources` | origin of imported data |
| `messages` | canonical email message store |
| `documents` | canonical note/link/upload/contact document store |
| `content_chunks` | chunked retrieval records with embeddings |
| `triage_results` | single-label message classification |
| `draft_replies` | generated/approved/sent reply lifecycle |
| `meeting_proposals` | extracted/approved/created meeting lifecycle |
| `briefings` | stored daily summaries |
| `chat_conversations` / `chat_messages` | persistent chat history |
| `jobs_audit` | queue/audit visibility |

## API surface

This is the most important route surface in the project today.

<details>
<summary><strong>Design philosophy behind the API</strong></summary>

The route surface mostly falls into four buckets:

- session and workspace context
- ingestion and connector orchestration
- retrieval and conversation state
- action generation plus approval-gated execution

</details>

### Auth and session

- `GET/POST /api/auth/[...all]`
- `POST /api/demo/sign-in`

### Connectors

- `GET /api/connect/google/start`
- `GET /api/connect/google/callback`
- `POST /api/connectors/google/sync`
- `GET /api/connectors/health`

### Ingestion

- `POST /api/notes`
- `POST /api/links`
- `POST /api/uploads/presign`
- `POST /api/uploads/complete`

### Inbox and actions

- `POST /api/triage`
- `POST /api/drafts`
- `POST /api/drafts/[draftId]/approve`
- `POST /api/drafts/[draftId]/send`
- `POST /api/meetings/proposals`
- `PATCH /api/meetings/proposals/[proposalId]`
- `POST /api/meetings/proposals/[proposalId]/approve`
- `POST /api/meetings/proposals/[proposalId]/create`
- `GET /api/meetings/calendar`

### Chat

- `POST /api/chat`
- `GET/POST /api/chat/conversations`
- `GET/PATCH/DELETE /api/chat/conversations/[conversationId]`

### Health

- `GET /api/health`

## Testing

The repo includes route-level and package-level tests across the web app, worker, AI package, DB helpers, and shared schemas.

Project test files currently present: `32`

Examples include:

- chat conversation API tests
- Google sync route tests
- draft approval/send tests
- meeting proposal approval/create tests
- retrieval tests
- benchmark scoring and report-generation tests
- scheduler tests
- chunking tests
- schema tests

Run everything with:

```bash
pnpm test
```

And type-check with:

```bash
pnpm typecheck
```

Run the live benchmark suite with:

```bash
pnpm benchmark
```

Each benchmark run writes timestamped outputs to `benchmark-reports/`, making every quoted metric traceable to a real report.

---

## Operational notes

### Demo bootstrap

The `bootstrap` service seeds the demo environment. It:

- ensures auth schema compatibility
- creates the demo user
- resets the demo workspace
- seeds messages, contacts, documents, meetings, briefs, and chat history
- uploads demo assets into MinIO

This is why the demo path feels complete instead of empty.

### Storage model

- canonical metadata lives in Postgres
- binary assets live in MinIO
- background work is coordinated through BullMQ + Redis
- retrieval embeddings are stored directly in Postgres via pgvector

### Health checks

- `/api/health` checks database reachability
- `/api/connectors/health` lists connector status for the current workspace

### Gmail sync model

The current implementation uses:

- initial recent inbox sync
- incremental history-based sync when a history cursor exists
- periodic polling via the worker scheduler

That means the Gmail connector is functional even without push webhook infrastructure.

## Current MVP constraints

This repo is already substantial, but it is still an MVP in a few important ways.

### 1. Some future integration surfaces are scaffolded but not implemented

There are route folders reserved for:

- Slack connect
- Gmail webhooks
- Slack webhooks

Those paths currently exist as scaffolding, not finished integrations.

### 2. Time zone handling is not fully generalized yet

Workspaces do store a timezone, and the scheduler uses it, but some flows still hardcode `Europe/Athens` during workspace creation and meeting/briefing logic.

### 3. Action execution is intentionally conservative

This is a feature, not a bug:

- drafts require approval before sending
- meetings require approval before calendar creation
- the `actions` queue worker is mostly a placeholder today

### 4. The architecture is production-shaped, but deployment docs are local-first

The repo is well set up for local Docker development, but it does not yet include a full production deployment story in the repository.

### 5. No repository license is included yet

If this project is going to be shared publicly, adding a `LICENSE` file would make the repo more complete.

---

## Why this codebase is interesting

Syntheci is more than a UI demo. It is a tightly connected system where:

- auth creates tenancy
- ingestion populates a canonical store
- workers normalize raw inputs into retrieval-ready chunks
- chat sits on top of the same canonical substrate as briefs, drafts, and meetings
- approval gates protect external side effects
- the seeded demo workspace proves the product loop from end to end

That combination makes the repo a strong reference for:

- AI-assisted workspace tooling
- approval-driven automation
- retrieval over mixed operational sources
- queue-backed ingestion pipelines
- demoable full-stack monorepos

<div align="center">
  <sub>Built for the Netcompany Hackathon 2026.</sub>
</div>
