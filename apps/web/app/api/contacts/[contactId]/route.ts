import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { contacts, db } from "@syntheci/db";

import { normalizeManualContactEmail, syncContactKnowledge } from "@/lib/contacts";
import { requireWorkspaceContext } from "@/lib/session";

const requestSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.union([z.string().trim().email(), z.literal("")]).optional(),
    phoneNumber: z.string().trim().optional(),
    company: z.string().trim().optional(),
    role: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .refine(
    (value) =>
      Object.values(value).some((entry) => entry !== undefined),
    {
      message: "At least one field must be provided."
    }
  );

function emptyToNull(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const { workspaceId } = await requireWorkspaceContext();
  const { contactId } = await params;
  const body = requestSchema.parse(await request.json());

  const existing = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.workspaceId, workspaceId))
  });

  if (!existing) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const nextEmailRaw = emptyToNull(body.email);
  const nextEmail = nextEmailRaw === undefined ? undefined : normalizeManualContactEmail(nextEmailRaw);

  if (nextEmail) {
    const conflict = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.email, nextEmail),
        ne(contacts.id, contactId)
      )
    });

    if (conflict) {
      return NextResponse.json({ error: "A contact with that email already exists." }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(contacts)
    .set({
      name: emptyToNull(body.name) ?? existing.name,
      email: nextEmail === undefined ? existing.email : nextEmail,
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
