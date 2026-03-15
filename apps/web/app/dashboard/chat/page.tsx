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
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-[1.75rem] border-border/80 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-foreground">Ask grounded questions without losing the thread</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Each conversation is now persistent, private to you inside this workspace, and easy to reopen later when you need the same trail of reasoning and citations.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Saved conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{conversations.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Current thread</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {initialConversation?.title ?? "Create a new conversation to begin."}
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">History scope</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Private per signed-in user within the current workspace.
            </CardContent>
          </Card>
        </section>
      </section>

      <ChatPanel initialConversations={conversations} initialConversation={initialConversation} />
    </main>
  );
}
