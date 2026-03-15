import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db, briefings, connectedAccounts, messages, triageResults } from "@syntheci/db";
import { TRIAGE_WEIGHT } from "@syntheci/shared";

export async function getConnectorStatus(workspaceId: string) {
  const rows = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.workspaceId, workspaceId),
    columns: {
      id: true,
      provider: true,
      scopes: true,
      updatedAt: true
    },
    orderBy: [desc(connectedAccounts.updatedAt)]
  });

  return rows;
}

export async function getPriorityInbox(workspaceId: string) {
  const rows = await db
    .select({
      id: messages.id,
      subject: messages.subject,
      textBody: messages.textBody,
      htmlBody: messages.htmlBody,
      senderName: messages.senderName,
      senderEmail: messages.senderEmail,
      receivedAt: messages.receivedAt,
      isUnread: messages.isUnread,
      label: triageResults.label,
      confidence: triageResults.confidence
    })
    .from(messages)
    .leftJoin(triageResults, eq(triageResults.messageId, messages.id))
    .where(and(eq(messages.workspaceId, workspaceId), eq(messages.isOpenThread, true)))
    .orderBy(desc(messages.receivedAt))
    .limit(60);

  return rows
    .map((row) => {
      const label = row.label ?? "informational";
      const base = TRIAGE_WEIGHT[label];
      const unreadBoost = row.isUnread ? 8 : 0;
      const confidenceBoost = (row.confidence ?? 0) * 10;
      return {
        ...row,
        score: base + unreadBoost + confidenceBoost
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function getLatestBriefing(workspaceId: string) {
  return db.query.briefings.findFirst({
    where: eq(briefings.workspaceId, workspaceId),
    orderBy: [desc(briefings.briefingDate)]
  });
}

export async function getMessageDetails(workspaceId: string, messageIds: string[]) {
  if (messageIds.length === 0) {
    return [];
  }

  return db.query.messages.findMany({
    where: and(eq(messages.workspaceId, workspaceId), inArray(messages.id, messageIds))
  });
}

export async function getOpenThreadCount(workspaceId: string) {
  const result = await db.execute(sql`
    select count(*)::int as count
    from messages
    where workspace_id = ${workspaceId}
    and is_open_thread = true
  `);

  return Number(result.rows[0]?.count ?? 0);
}
