import type { TriageLabel } from "./types";

export const TRIAGE_WEIGHT: Record<TriageLabel, number> = {
  urgent: 100,
  needs_reply: 80,
  follow_up: 65,
  scheduling: 55,
  informational: 20
};

export const SOURCE_LABELS = {
  gmail: "Email",
  slack: "Slack",
  note: "Note",
  upload: "Upload",
  link: "Link"
} as const;

export const DAILY_BRIEFING_HOUR_LOCAL = 9;
