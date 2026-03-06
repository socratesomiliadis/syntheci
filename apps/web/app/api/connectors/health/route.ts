import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { connectedAccounts, db } from "@syntheci/db";

import { requireWorkspaceContext } from "@/lib/session";

export async function GET() {
  const { workspaceId } = await requireWorkspaceContext();
  const rows = await db.query.connectedAccounts.findMany({
    where: eq(connectedAccounts.workspaceId, workspaceId),
    orderBy: [desc(connectedAccounts.updatedAt)],
    columns: {
      id: true,
      provider: true,
      tokenExpiresAt: true,
      updatedAt: true,
      metadata: true
    }
  });

  return NextResponse.json({
    connectors: rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      tokenExpiresAt: row.tokenExpiresAt,
      updatedAt: row.updatedAt
    }))
  });
}
