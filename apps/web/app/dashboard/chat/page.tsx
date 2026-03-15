import { ChatPanel } from "@/components/dashboard/chat-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChatConversation, listChatConversations } from "@/lib/chat";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { session, workspaceId } = await requireWorkspaceContext();
  const params = await searchParams;

  const conversations = await listChatConversations({
    workspaceId,
    userId: session.user.id
  });

  const requestedConversationId = params.conversation ?? conversations[0]?.id ?? null;
  const initialConversation = requestedConversationId
    ? await getChatConversation({
        conversationId: requestedConversationId,
        workspaceId,
        userId: session.user.id
      })
    : null;

  return (
    <main className="space-y-4 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Saved conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{conversations.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Current thread</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {initialConversation?.title ?? "Create a new conversation to begin."}
          </CardContent>
        </Card>
      </section>

      <ChatPanel initialConversations={conversations} initialConversation={initialConversation} />
    </main>
  );
}
