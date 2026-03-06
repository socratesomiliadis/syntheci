import { and, eq } from "drizzle-orm";

import { db, memberships, users, workspaces } from "@syntheci/db";

export interface AuthIdentity {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export async function ensureWorkspaceForUser(identity: AuthIdentity) {
  await db
    .insert(users)
    .values({
      id: identity.id,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.image ?? null
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: identity.email,
        name: identity.name,
        imageUrl: identity.image ?? null,
        updatedAt: new Date()
      }
    });

  const existingMembership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, identity.id)
  });

  if (existingMembership) {
    return existingMembership.workspaceId;
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerUserId: identity.id,
      name: `${identity.name.split(" ")[0]}'s Workspace`,
      timezone: "Europe/Athens"
    })
    .returning({ id: workspaces.id });

  await db.insert(memberships).values({
    workspaceId: workspace.id,
    userId: identity.id,
    role: "owner"
  });

  return workspace.id;
}

export async function getWorkspaceIdForUser(userId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId))
  });
  return membership?.workspaceId ?? null;
}
