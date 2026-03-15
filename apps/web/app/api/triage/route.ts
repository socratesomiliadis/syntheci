import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { chatModelVersion, classifyMessageTriage } from "@syntheci/ai";
import { db, messages, triageResults } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  messageId: z.string().uuid()
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const message = await db.query.messages.findFirst({
    where: and(eq(messages.id, body.messageId), eq(messages.workspaceId, workspaceId))
  });

  if (!message) {
    return NextResponse.json({ error: "message not found" }, { status: 404 });
  }

  const triage = await classifyMessageTriage({
    subject: message.subject,
    body: message.textBody,
    sender: message.senderEmail
  });

  const [saved] = await db
    .insert(triageResults)
    .values({
      workspaceId,
      messageId: message.id,
      label: triage.label,
      confidence: triage.confidence,
      rationale: triage.rationale,
      modelVersion: chatModelVersion
    })
    .onConflictDoUpdate({
      target: triageResults.messageId,
      set: {
        label: triage.label,
        confidence: triage.confidence,
        rationale: triage.rationale,
        modelVersion: chatModelVersion,
        updatedAt: new Date()
      }
    })
    .returning({
      label: triageResults.label,
      confidence: triageResults.confidence,
      rationale: triageResults.rationale
    });

  return NextResponse.json(saved);
}
