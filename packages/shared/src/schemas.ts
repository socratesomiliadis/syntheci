import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "gmail",
  "slack",
  "note",
  "upload",
  "link"
]);

export const triageLabelSchema = z.enum([
  "urgent",
  "needs_reply",
  "follow_up",
  "scheduling",
  "informational"
]);

export const draftReplyStatusSchema = z.enum([
  "generated",
  "approved",
  "sent",
  "failed"
]);

export const meetingProposalStatusSchema = z.enum([
  "proposed",
  "approved",
  "created",
  "rejected"
]);

export const chatCitationSchema = z.object({
  sourceType: sourceTypeSchema,
  sourceId: z.string().min(1),
  messageOrDocId: z.string().min(1),
  snippet: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  deepLink: z.string().url().nullable()
});

export const triageResultSchema = z.object({
  label: triageLabelSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1)
});

export const briefingItemSchema = z.object({
  type: z.enum(["priority", "todo", "meeting", "followup"]),
  title: z.string().min(1),
  reason: z.string().min(1),
  sourceRefs: z
    .array(
      z.object({
        sourceType: sourceTypeSchema,
        sourceId: z.string().min(1),
        messageOrDocId: z.string().min(1)
      })
    )
    .default([])
});

export const dailyBriefingSchema = z.object({
  summary: z.string().min(1),
  items: z.array(briefingItemSchema)
});

export const chatAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(chatCitationSchema)
});

export const sourceFilterSchema = z.object({
  sourceTypes: z.array(sourceTypeSchema).optional(),
  query: z.string().min(1)
});
