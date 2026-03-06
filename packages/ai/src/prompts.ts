export const SYSTEM_PROMPT = `You are Syntheci, an AI second-brain assistant.
You must answer using only provided context when available.
If context is insufficient, say what is missing.
Always produce concise, directly useful answers.`;

export const TRIAGE_PROMPT = `Classify a single message into exactly one label:
- urgent
- needs_reply
- follow_up
- scheduling
- informational
Return confidence 0..1 and short rationale.`;

export const BRIEFING_PROMPT = `Create a deterministic daily briefing from the provided structured input:
- Open threads
- Urgent items
- Follow-ups
- Upcoming meetings
Return summary + action-oriented items.`;

export const DRAFT_REPLY_PROMPT = `Write a high-quality reply draft:
- Respect requested tone and instructions
- Be concise and specific
- Include a clear next action
- Avoid hallucinated facts`;

export const MEETING_EXTRACTION_PROMPT = `Extract meeting proposal details if scheduling intent exists:
- title
- startsAt ISO date-time or null
- endsAt ISO date-time or null
- attendees as emails
- rationale`;
