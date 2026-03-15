import { generateObject } from "ai";
import { z } from "zod";

import { triageResultSchema } from "@syntheci/shared";

import { chatModel } from "./client";
import { TRIAGE_PROMPT } from "./prompts";

const triageInputSchema = z.object({
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  sender: z.string().nullable().optional()
});

const triageOutputSchema = z.object({
  label: triageResultSchema.shape.label,
  confidence: triageResultSchema.shape.confidence,
  rationale: triageResultSchema.shape.rationale
});

function classifyWithHeuristics(input: z.infer<typeof triageInputSchema>) {
  const normalized = `${input.subject ?? ""}\n${input.body}\n${input.sender ?? ""}`.toLowerCase();
  const hasConcreteTime =
    /\b(\d{1,2}:\d{2}|\d{1,2}(am|pm)|monday|tuesday|wednesday|thursday|friday)\b/.test(normalized);
  const hasSchedulingVerb =
    /\b(move|reschedule|shift|calendar hold|availability|works for your side|would that work|can we lock)\b/.test(
      normalized
    );
  const hasMeetingNoun = /\b(meeting|call|workshop|panel|debrief)\b/.test(normalized);

  if (/\b(no action needed|just wanted to share|sharing the|status report|for awareness)\b/.test(normalized)) {
    return triageOutputSchema.parse({
      label: "informational",
      confidence: 0.9,
      rationale: "The sender is sharing information without asking for follow-up."
    });
  }

  if (
    /\b(following up|checking in|one more thing|a few notes|if you are open to it|if helpful|happy to send|proof points|early next week|design partner|annotated screenshots|narrative|no rush)\b/.test(
      normalized
    )
  ) {
    return triageOutputSchema.parse({
      label: "follow_up",
      confidence: 0.82,
      rationale: "The message adds context or makes a low-pressure request that can be handled later."
    });
  }

  if (
    /\b(approve|approval|sign-off|sign off|send me|send the|send your|could you send|share the latest|reply with approval|commercial sign-off|final answer|final commercial position|outline what|what would it take|waiting on)\b/.test(
      normalized
    )
  ) {
    return triageOutputSchema.parse({
      label: "needs_reply",
      confidence: 0.89,
      rationale: "The sender is waiting on a concrete answer, approval, or artifact."
    });
  }

  if (
    /\b(blocker|blocking|urgent|outage|asap|immediate|security review readiness|fixed today)\b/.test(
      normalized
    )
  ) {
    return triageOutputSchema.parse({
      label: "urgent",
      confidence: 0.95,
      rationale: "The message describes an immediate blocker or operational risk."
    });
  }

  if (
    /\b(today|tonight|tomorrow morning|7pm|by 7pm)\b/.test(normalized) &&
    /\b(summary|launch|readiness|committee meets|security review)\b/.test(normalized)
  ) {
    return triageOutputSchema.parse({
      label: "urgent",
      confidence: 0.92,
      rationale: "The message has a same-day deadline tied to launch or review execution."
    });
  }

  if (
    (hasSchedulingVerb && hasMeetingNoun) ||
    (hasMeetingNoun && hasConcreteTime && /\b(move|reschedule|shift|works for your side|would that work|lock|calendar hold)\b/.test(normalized))
  ) {
    return triageOutputSchema.parse({
      label: "scheduling",
      confidence: 0.93,
      rationale: "The message is primarily about confirming or changing a meeting time."
    });
  }

  return null;
}

export async function classifyMessageTriage(input: {
  subject?: string | null;
  body: string;
  sender?: string | null;
}) {
  const parsedInput = triageInputSchema.parse(input);
  const heuristicResult = classifyWithHeuristics(parsedInput);
  if (heuristicResult) {
    return heuristicResult;
  }

  const { object } = await generateObject({
    model: chatModel,
    schema: triageOutputSchema,
    system: TRIAGE_PROMPT,
    prompt: JSON.stringify(parsedInput)
  });

  return triageOutputSchema.parse(object);
}
