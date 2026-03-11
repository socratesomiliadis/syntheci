import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteChatConversation,
  getChatConversation,
  renameChatConversation
} from "@/lib/chat";
import { requireWorkspaceContext } from "@/lib/session";

const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const { conversationId } = await params;

  const conversation = await getChatConversation({
    conversationId,
    workspaceId,
    userId: session.user.id
  });

  if (!conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const { conversationId } = await params;
  const body = renameConversationSchema.parse(await request.json());

  const conversation = await renameChatConversation({
    conversationId,
    workspaceId,
    userId: session.user.id,
    title: body.title
  });

  if (!conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const { conversationId } = await params;

  const deleted = await deleteChatConversation({
    conversationId,
    workspaceId,
    userId: session.user.id
  });

  if (!deleted) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
