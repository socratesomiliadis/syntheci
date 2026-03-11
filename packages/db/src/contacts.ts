import { and, eq } from "drizzle-orm";

import { db } from "./client";
import { contacts } from "./schema";

export function normalizeContactEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export async function findWorkspaceContactByEmail(input: {
  workspaceId: string;
  email: string | null | undefined;
}) {
  const normalizedEmail = normalizeContactEmail(input.email);
  if (!normalizedEmail) {
    return null;
  }

  return db.query.contacts.findFirst({
    where: and(
      eq(contacts.workspaceId, input.workspaceId),
      eq(contacts.email, normalizedEmail)
    )
  });
}

export async function upsertObservedContact(input: {
  workspaceId: string;
  name?: string | null;
  email: string;
  origin?: string;
  observedAt?: Date;
  lastMessageAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const normalizedEmail = normalizeContactEmail(input.email);
  if (!normalizedEmail) {
    return null;
  }

  const observedAt = input.observedAt ?? new Date();
  const existing = await findWorkspaceContactByEmail({
    workspaceId: input.workspaceId,
    email: normalizedEmail
  });

  if (existing) {
    const [updated] = await db
      .update(contacts)
      .set({
        name: existing.name ?? input.name ?? null,
        origin: existing.origin === "manual" ? existing.origin : input.origin ?? existing.origin,
        metadata: {
          ...(existing.metadata as Record<string, unknown>),
          ...(input.metadata ?? {})
        },
        lastSeenAt: observedAt,
        lastMessageAt:
          input.lastMessageAt &&
          (!existing.lastMessageAt || input.lastMessageAt > existing.lastMessageAt)
            ? input.lastMessageAt
            : existing.lastMessageAt,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(contacts)
    .values({
      workspaceId: input.workspaceId,
      name: input.name ?? null,
      email: normalizedEmail,
      origin: input.origin ?? "observed",
      metadata: input.metadata ?? {},
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      lastMessageAt: input.lastMessageAt ?? null
    })
    .returning();

  return created;
}
