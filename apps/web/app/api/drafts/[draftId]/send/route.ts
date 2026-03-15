import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  connectedAccounts,
  db,
  draftReplies,
  messages,
  sources
} from "@syntheci/db";

import { decryptSecret } from "@/lib/crypto";
import { isDemoConnectedAccount } from "@/lib/demo";
import { sendGmailReply } from "@/lib/google";
import { requireWorkspaceContext } from "@/lib/session";

export async function POST(
  _request: NextRequest,
  context: {
    params: Promise<{
      draftId: string;
    }>;
  }
) {
  const { workspaceId } = await requireWorkspaceContext();
  const { draftId } = await context.params;

  const draft = await db.query.draftReplies.findFirst({
    where: and(eq(draftReplies.id, draftId), eq(draftReplies.workspaceId, workspaceId))
  });
  if (!draft) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }
  if (draft.status !== "approved") {
    return NextResponse.json({ error: "draft must be approved before send" }, { status: 400 });
  }

  const message = await db.query.messages.findFirst({
    where: and(eq(messages.id, draft.messageId), eq(messages.workspaceId, workspaceId))
  });
  if (!message) {
    return NextResponse.json({ error: "message not found" }, { status: 404 });
  }

  const source = await db.query.sources.findFirst({
    where: and(eq(sources.id, message.sourceId), eq(sources.workspaceId, workspaceId))
  });
  if (!source?.connectedAccountId) {
    return NextResponse.json({ error: "source is not tied to OAuth account" }, { status: 400 });
  }

  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, source.connectedAccountId),
      eq(connectedAccounts.workspaceId, workspaceId),
      eq(connectedAccounts.provider, "google")
    )
  });
  if (!account) {
    return NextResponse.json({ error: "google connector not found" }, { status: 404 });
  }

  try {
    if (isDemoConnectedAccount(account)) {
      const [updated] = await db
        .update(draftReplies)
        .set({
          status: "sent",
          sentAt: new Date(),
          errorMessage: null,
          updatedAt: new Date()
        })
        .where(eq(draftReplies.id, draft.id))
        .returning({
          id: draftReplies.id,
          status: draftReplies.status
        });

      return NextResponse.json(updated);
    }

    const accessToken = decryptSecret(account.accessTokenCiphertext);
    const refreshToken = account.refreshTokenCiphertext
      ? decryptSecret(account.refreshTokenCiphertext)
      : null;

    await sendGmailReply({
      accessToken,
      refreshToken,
      to: message.senderEmail ?? "",
      subject: message.subject?.startsWith("Re:") ? message.subject : `Re: ${message.subject ?? ""}`,
      body: draft.body,
      threadId: message.externalThreadId
    });

    const [updated] = await db
      .update(draftReplies)
      .set({
        status: "sent",
        sentAt: new Date(),
        errorMessage: null,
        updatedAt: new Date()
      })
      .where(eq(draftReplies.id, draft.id))
      .returning({
        id: draftReplies.id,
        status: draftReplies.status
      });

    return NextResponse.json(updated);
  } catch (error) {
    const [updated] = await db
      .update(draftReplies)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "send failed",
        updatedAt: new Date()
      })
      .where(eq(draftReplies.id, draft.id))
      .returning({
        id: draftReplies.id,
        status: draftReplies.status
      });

    return NextResponse.json(updated, { status: 502 });
  }
}
