import { ContactBook } from "@/components/dashboard/contact-book";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { backfillContactsFromMessages, listContactsWithStats } from "@/lib/contacts";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const { workspaceId } = await requireWorkspaceContext();
  const resolvedSearchParams = await searchParams;

  await backfillContactsFromMessages(workspaceId);
  const contacts = await listContactsWithStats(workspaceId);
  const initialSelectedContactId =
    resolvedSearchParams.contact && contacts.some((contact) => contact.id === resolvedSearchParams.contact)
      ? resolvedSearchParams.contact
      : contacts[0]?.id ?? null;

  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <Card className="rounded-[1.75rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(238,250,248,0.96))] shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl tracking-tight text-slate-950">
            Contacts become durable system context, not just names in an inbox.
          </CardTitle>
        </CardHeader>
        <CardContent className="max-w-3xl text-sm leading-6 text-slate-600">
          Every profile here can start from a sender line, then grow into reusable context for retrieval,
          scheduling, and future follow-up work across the workspace.
        </CardContent>
      </Card>

      <ContactBook
        initialContacts={contacts.map((contact) => ({
          ...contact,
          firstSeenAt: contact.firstSeenAt.toISOString(),
          lastSeenAt: contact.lastSeenAt.toISOString(),
          lastMessageAt: contact.lastMessageAt?.toISOString() ?? null,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString()
        }))}
        initialSelectedContactId={initialSelectedContactId}
      />
    </main>
  );
}
