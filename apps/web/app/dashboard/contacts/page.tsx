import { ContactBook } from "@/components/dashboard/contact-book";
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
    <main className="px-4 py-5 md:px-6 md:py-6">
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
