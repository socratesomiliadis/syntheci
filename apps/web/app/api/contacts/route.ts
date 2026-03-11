import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { contacts, db } from "@syntheci/db";

import {
  backfillContactsFromMessages,
  listContactsWithStats,
  normalizeManualContactEmail,
  syncContactKnowledge
} from "@/lib/contacts";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z
  .object({
    name: z.string().trim().optional().nullable(),
    email: z.union([z.string().trim().email(), z.literal("")]).optional().nullable(),
    phoneNumber: z.string().trim().optional().nullable(),
    company: z.string().trim().optional().nullable(),
    role: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable()
  })
  .refine((value) => Boolean(value.name || value.email), {
    message: "Name or email is required."
  });

function emptyToNull(value: string | null | undefined) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeContact(contact: Awaited<ReturnType<typeof listContactsWithStats>>[number]) {
  return {
    ...contact,
    firstSeenAt: contact.firstSeenAt.toISOString(),
    lastSeenAt: contact.lastSeenAt.toISOString(),
    lastMessageAt: contact.lastMessageAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString()
  };
}

export async function GET() {
  const { workspaceId } = await requireWorkspaceContext();
  await backfillContactsFromMessages(workspaceId);
  const records = await listContactsWithStats(workspaceId);

  return NextResponse.json({
    contacts: records.map(serializeContact)
  });
}

export async function POST(request: Request) {
  const { workspaceId } = await requireWorkspaceContext();
  const body = requestSchema.parse(await request.json());
  const email = normalizeManualContactEmail(emptyToNull(body.email));

  if (email) {
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.workspaceId, workspaceId), eq(contacts.email, email))
    });

    if (existing) {
      const [updated] = await db
        .update(contacts)
        .set({
          name: emptyToNull(body.name) ?? existing.name,
          email,
          phoneNumber: emptyToNull(body.phoneNumber) ?? existing.phoneNumber,
          company: emptyToNull(body.company) ?? existing.company,
          role: emptyToNull(body.role) ?? existing.role,
          notes: emptyToNull(body.notes) ?? existing.notes,
          origin: "manual",
          updatedAt: new Date()
        })
        .where(eq(contacts.id, existing.id))
        .returning();

      await syncContactKnowledge(updated);

      return NextResponse.json({
        contact: {
          ...updated,
          firstSeenAt: updated.firstSeenAt.toISOString(),
          lastSeenAt: updated.lastSeenAt.toISOString(),
          lastMessageAt: updated.lastMessageAt?.toISOString() ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString()
        }
      });
    }
  }

  const [created] = await db
    .insert(contacts)
    .values({
      workspaceId,
      name: emptyToNull(body.name),
      email,
      phoneNumber: emptyToNull(body.phoneNumber),
      company: emptyToNull(body.company),
      role: emptyToNull(body.role),
      notes: emptyToNull(body.notes),
      origin: "manual"
    })
    .returning();

  await syncContactKnowledge(created);

  return NextResponse.json({
    contact: {
      ...created,
      firstSeenAt: created.firstSeenAt.toISOString(),
      lastSeenAt: created.lastSeenAt.toISOString(),
      lastMessageAt: created.lastMessageAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }
  });
}
