import { NextResponse } from "next/server";
import { z } from "zod";

import { createChatConversation, listChatConversations } from "@/lib/chat";
import { requireWorkspaceContext } from "@/lib/session";

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional()
});

export async function GET() {
  const { session, workspaceId } = await requireWorkspaceContext();

  const conversations = await listChatConversations({
    workspaceId,
    userId: session.user.id
  });

  return NextResponse.json({
    conversations
  });
}

export async function POST(request: Request) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const body = createConversationSchema.parse(await request.json().catch(() => ({})));

  const conversation = await createChatConversation({
    workspaceId,
    userId: session.user.id,
    title: body.title
  });

  return NextResponse.json(conversation, { status: 201 });
}
