import { NextResponse } from "next/server";
import { z } from "zod";

import { TRIAGE_WEIGHT } from "@syntheci/shared";

import { createDemoMessage, getDemoGmailSource, triageDemoMessage } from "@/lib/demo";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z.object({
  senderName: z.string().trim().min(1).max(120),
  senderEmail: z.email(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000)
});

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());

  const demoSource = await getDemoGmailSource({
    workspaceId
  });

  if (!demoSource) {
    return NextResponse.json(
      { error: "demo mode is not enabled for this workspace" },
      { status: 403 }
    );
  }

  const message = await createDemoMessage({
    workspaceId,
    sourceId: demoSource.sourceId,
    senderName: body.senderName,
    senderEmail: body.senderEmail,
    subject: body.subject,
    textBody: body.body
  });

  const triage = await triageDemoMessage({
    workspaceId,
    messageId: message.id,
    subject: message.subject,
    textBody: message.textBody,
    senderEmail: message.senderEmail
  });

  return NextResponse.json({
    ok: true,
    message: {
      ...message,
      label: triage.label,
      confidence: triage.confidence,
      rationale: triage.rationale,
      score: TRIAGE_WEIGHT[triage.label] + 8 + triage.confidence * 10
    }
  });
}
