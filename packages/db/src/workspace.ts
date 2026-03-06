import { and, eq } from "drizzle-orm";

import { db } from "./client";
import { memberships } from "./schema";

export async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId))
  });

  if (!membership) {
    throw new Error("Unauthorized workspace access");
  }

  return membership;
}
