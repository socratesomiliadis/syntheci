import { ChatPanel } from "@/components/dashboard/chat-panel";
import { getChatConversation, listChatConversations } from "@/lib/chat";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const params = await searchParams;

  const conversations = await listChatConversations({
    workspaceId,
    userId: session.user.id,
  });

  const requestedConversationId =
    params.conversation ?? conversations[0]?.id ?? null;
  const initialConversation = requestedConversationId
    ? await getChatConversation({
        conversationId: requestedConversationId,
        workspaceId,
        userId: session.user.id,
      })
    : null;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-5 md:px-6 md:py-6">
      <ChatPanel
        initialConversations={conversations}
        initialConversation={initialConversation}
      />
    </main>
  );
}
