import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateReplyDraft } from "@syntheci/ai";
import { db, draftReplies, messages } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  messageId: z.string().uuid(),
  tone: z.string().optional(),
  instructions: z.string().optional()
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

  const draftBody = await generateReplyDraft({
    subject: message.subject,
    body: message.textBody,
    tone: body.tone,
    instructions: body.instructions
  });

  const [draft] = await db
    .insert(draftReplies)
    .values({
      workspaceId,
      messageId: message.id,
      tone: body.tone ?? null,
      instructions: body.instructions ?? null,
      body: draftBody,
      status: "generated"
    })
    .returning({
      id: draftReplies.id,
      status: draftReplies.status
    });

  return NextResponse.json(draft);
}
