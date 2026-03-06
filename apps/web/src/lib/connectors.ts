import { and, eq } from "drizzle-orm";

import { connectedAccounts, db, sources } from "@syntheci/db";
import type { SourceType } from "@syntheci/shared";

import { decryptSecret, encryptSecret } from "./crypto";

export async function upsertConnectedAccount(input: {
  workspaceId: string;
  userId: string;
  provider: string;
  externalAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  tokenExpiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const accessTokenCiphertext = encryptSecret(input.accessToken);
  const refreshTokenCiphertext = input.refreshToken
    ? encryptSecret(input.refreshToken)
    : null;

  const existing = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.provider, input.provider),
      eq(connectedAccounts.externalAccountId, input.externalAccountId)
    )
  });

  if (existing) {
    const [updated] = await db
      .update(connectedAccounts)
      .set({
        workspaceId: input.workspaceId,
        userId: input.userId,
        scopes: input.scopes,
        accessTokenCiphertext,
        refreshTokenCiphertext,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        metadata: input.metadata ?? {},
        updatedAt: new Date()
      })
      .where(eq(connectedAccounts.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(connectedAccounts)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider: input.provider,
      externalAccountId: input.externalAccountId,
      scopes: input.scopes,
      accessTokenCiphertext,
      refreshTokenCiphertext,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      metadata: input.metadata ?? {}
    })
    .returning();

  return created;
}

export async function upsertSource(input: {
  workspaceId: string;
  connectedAccountId?: string | null;
  type: SourceType;
  externalSourceId?: string | null;
  displayName: string;
  metadata?: Record<string, unknown>;
}) {
  const existing = await db.query.sources.findFirst({
    where:
      input.externalSourceId && input.connectedAccountId
        ? and(
            eq(sources.workspaceId, input.workspaceId),
            eq(sources.connectedAccountId, input.connectedAccountId),
            eq(sources.externalSourceId, input.externalSourceId)
          )
        : and(eq(sources.workspaceId, input.workspaceId), eq(sources.displayName, input.displayName))
  });

  if (existing) {
    const [updated] = await db
      .update(sources)
      .set({
        type: input.type,
        displayName: input.displayName,
        metadata: input.metadata ?? {},
        updatedAt: new Date()
      })
      .where(eq(sources.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(sources)
    .values({
      workspaceId: input.workspaceId,
      connectedAccountId: input.connectedAccountId ?? null,
      type: input.type,
      externalSourceId: input.externalSourceId ?? null,
      displayName: input.displayName,
      metadata: input.metadata ?? {}
    })
    .returning();

  return created;
}

export async function getConnectedAccountTokens(connectedAccountId: string) {
  const account = await db.query.connectedAccounts.findFirst({
    where: eq(connectedAccounts.id, connectedAccountId)
  });

  if (!account) {
    return null;
  }

  return {
    ...account,
    accessToken: decryptSecret(account.accessTokenCiphertext),
    refreshToken: account.refreshTokenCiphertext
      ? decryptSecret(account.refreshTokenCiphertext)
      : null
  };
}
