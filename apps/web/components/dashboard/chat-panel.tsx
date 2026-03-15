"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useChat } from "@ai-sdk/react";
import { isReasoningUIPart, isTextUIPart } from "ai";
import {
  Edit3,
  Loader2,
  Menu,
  MessageSquarePlus,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ChatConversationDetail, ChatConversationSummary, ChatCitation, SourceType } from "@syntheci/shared";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { toUIMessage, type ChatMessage } from "@/lib/chat-ui";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

const sourceOptions: SourceType[] = ["gmail", "note", "upload", "link", "contact"];

function messageText(message: ChatMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("")
    .trim();
}

function messageReasoning(message: ChatMessage) {
  return message.parts
    .filter(isReasoningUIPart)
    .map((part) => part.text)
    .join("")
    .trim();
}

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "Request failed.";
    throw new Error(errorMessage);
  }

  return payload as T;
}

function ConversationList({
  conversations,
  activeConversationId,
  isLoadingConversation,
  editingConversationId,
  editingTitle,
  onEditingTitleChange,
  onSelectConversation,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDeleteConversation,
  onCreateConversation
}: {
  conversations: ChatConversationSummary[];
  activeConversationId: string | null;
  isLoadingConversation: boolean;
  editingConversationId: string | null;
  editingTitle: string;
  onEditingTitleChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartRename: (conversation: ChatConversationSummary) => void;
  onCancelRename: () => void;
  onSaveRename: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Chat history
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Private threads for this user.</p>
        </div>
        <Button size="sm" className="rounded-xl" onClick={onCreateConversation}>
          <MessageSquarePlus className="size-3.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {conversations.length === 0 ? (
          <div className="rounded-[1.05rem] border border-dashed border-border bg-muted/80 px-4 py-6 text-sm text-muted-foreground">
            No saved chats yet. Start a conversation to build your history.
          </div>
        ) : (
          conversations.map((conversation, index) => {
            const isActive = conversation.id === activeConversationId;
            const isEditing = editingConversationId === conversation.id;

            return (
              <motion.article
                key={conversation.id}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={listItemReveal}
                transition={withStagger(index, 0.03)}
                className={cn(
                  "rounded-[1.05rem] border px-3 py-3 transition-colors",
                  isActive
                    ? "border-info/25 bg-info/10 shadow-sm"
                    : "border-border/80 bg-card/80 hover:bg-muted"
                )}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editingTitle}
                      onChange={(event) => onEditingTitleChange(event.target.value)}
                      className="h-9 rounded-lg border-border bg-card"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onSaveRename(conversation.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={onCancelRename}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{conversation.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {conversation.preview ?? "No messages yet"}
                          </p>
                        </div>
                        {isLoadingConversation && isActive ? (
                          <Loader2 className="mt-0.5 size-4 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                    </button>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {conversation.latestMessageAt
                          ? new Date(conversation.latestMessageAt).toLocaleDateString()
                          : "Empty"}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onStartRename(conversation)}
                          aria-label={`Rename ${conversation.title}`}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onDeleteConversation(conversation.id)}
                          aria-label={`Delete ${conversation.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  initialConversations,
  initialConversation
}: {
  initialConversations: ChatConversationSummary[];
  initialConversation: ChatConversationDetail | null;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] = useState<ChatConversationDetail | null>(
    initialConversation
  );
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status, stop, error } = useChat<ChatMessage>({
    id: activeConversation?.id ?? "chat",
    messages: initialConversation ? initialConversation.messages.map(toUIMessage) : [],
    onFinish: () => {
      void refreshConversations();
    }
  });

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setActiveConversation(initialConversation);
    setMessages(initialConversation ? initialConversation.messages.map(toUIMessage) : []);
  }, [initialConversation, setMessages]);

  const streamingMessageId = useMemo(() => {
    if (status !== "streaming") return null;
    return [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;
  }, [messages, status]);

  async function refreshConversations() {
    const response = await fetch("/api/chat/conversations", { cache: "no-store" });
    const payload = await readJson<{ conversations: ChatConversationSummary[] }>(response);

    startTransition(() => {
      setConversations(payload.conversations);
      if (activeConversation) {
        const refreshedActive = payload.conversations.find((item) => item.id === activeConversation.id);
        if (refreshedActive) {
          setActiveConversation((current) =>
            current
              ? {
                  ...current,
                  title: refreshedActive.title,
                  createdAt: refreshedActive.createdAt,
                  updatedAt: refreshedActive.updatedAt,
                  latestMessageAt: refreshedActive.latestMessageAt,
                  preview: refreshedActive.preview
                }
              : current
          );
        }
      }
    });
  }

  async function loadConversation(conversationId: string) {
    setIsLoadingConversation(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        cache: "no-store"
      });
      const conversation = await readJson<ChatConversationDetail>(response);

      startTransition(() => {
        setActiveConversation(conversation);
        setMessages(conversation.messages.map(toUIMessage));
        router.replace(`/dashboard/chat?conversation=${conversationId}`, { scroll: false });
        setRailOpen(false);
      });
    } catch (loadError) {
      setStatusMessage(loadError instanceof Error ? loadError.message : "Unable to load conversation.");
    } finally {
      setIsLoadingConversation(false);
    }
  }

  async function createConversation() {
    setStatusMessage(null);

    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      const conversation = await readJson<ChatConversationSummary>(response);
      const detail: ChatConversationDetail = {
        ...conversation,
        messages: []
      };

      startTransition(() => {
        setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
        setActiveConversation(detail);
        setMessages([]);
        setSelectedSources([]);
        router.replace(`/dashboard/chat?conversation=${conversation.id}`, { scroll: false });
        setRailOpen(false);
      });

      return detail;
    } catch (createError) {
      setStatusMessage(createError instanceof Error ? createError.message : "Unable to create chat.");
      return null;
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!window.confirm("Delete this conversation permanently?")) {
      return;
    }

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE"
      });
      await readJson<{ ok: true }>(response);

      const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
      setConversations(remaining);

      if (activeConversation?.id === conversationId) {
        const nextConversation = remaining[0] ?? null;
        if (nextConversation) {
          await loadConversation(nextConversation.id);
        } else {
          startTransition(() => {
            setActiveConversation(null);
            setMessages([]);
            router.replace("/dashboard/chat", { scroll: false });
          });
        }
      }
    } catch (deleteError) {
      setStatusMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete conversation.");
    }
  }

  function handleStartRename(conversation: ChatConversationSummary) {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title);
  }

  async function handleSaveRename(conversationId: string) {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) return;

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: nextTitle })
      });
      const conversation = await readJson<ChatConversationSummary>(response);

      startTransition(() => {
        setConversations((current) =>
          current.map((item) => (item.id === conversation.id ? conversation : item))
        );
        setActiveConversation((current) =>
          current && current.id === conversation.id ? { ...current, title: conversation.title } : current
        );
        setEditingConversationId(null);
        setEditingTitle("");
      });
    } catch (renameError) {
      setStatusMessage(renameError instanceof Error ? renameError.message : "Unable to rename conversation.");
    }
  }

  function toggleSource(source: SourceType) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]
    );
  }

  const canSubmit = status !== "submitted" && status !== "streaming";
  const activeConversationId = activeConversation?.id ?? null;
  const showAssistantPlaceholder =
    status === "submitted" || (status === "streaming" && !streamingMessageId);

  const activeConversationLabel = activeConversation?.title ?? "Unsaved chat";

  const rail = (
    <ConversationList
      conversations={conversations}
      activeConversationId={activeConversationId}
      isLoadingConversation={isLoadingConversation}
      editingConversationId={editingConversationId}
      editingTitle={editingTitle}
      onEditingTitleChange={setEditingTitle}
      onSelectConversation={(conversationId) => {
        void loadConversation(conversationId);
      }}
      onStartRename={handleStartRename}
      onCancelRename={() => {
        setEditingConversationId(null);
        setEditingTitle("");
      }}
      onSaveRename={(conversationId) => {
        void handleSaveRename(conversationId);
      }}
      onDeleteConversation={(conversationId) => {
        void handleDeleteConversation(conversationId);
      }}
      onCreateConversation={() => {
        void createConversation();
      }}
    />
  );

  return (
    <motion.section initial="initial" animate="animate" variants={panelReveal} transition={panelTransition}>
      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="hidden h-[calc(100vh-13rem)] rounded-[1.7rem] border-border/80 bg-card/92 shadow-sm xl:flex">
          {rail}
        </Card>

        <Card className="min-h-[42rem] rounded-[1.8rem] border-border/80 bg-card/92 shadow-sm">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 xl:hidden">
                  <Sheet open={railOpen} onOpenChange={setRailOpen}>
                    <SheetTrigger
                      render={
                        <Button variant="outline" size="sm" className="rounded-xl" />
                      }
                    >
                      <Menu className="size-4" />
                      Chats
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[92vw] max-w-sm p-0">
                      <SheetHeader className="sr-only">
                        <SheetTitle>Chat history</SheetTitle>
                      </SheetHeader>
                      {rail}
                    </SheetContent>
                  </Sheet>
                </div>
                <div>
                  <CardTitle className="text-2xl tracking-tight">{activeConversationLabel}</CardTitle>
                  <CardDescription className="mt-1">
                    Ask grounded questions across inbox, contacts, notes, uploads, and links with saved history per conversation.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="tone-info">
                  <Sparkles className="mr-1 size-3.5" />
                  Streaming RAG
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {selectedSources.length === 0 ? "All sources" : `${selectedSources.length} filters`}
                </Badge>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {sourceOptions.map((source, index) => (
                <motion.div
                  key={source}
                  initial="initial"
                  animate="animate"
                  variants={listItemReveal}
                  transition={withStagger(index, 0.04)}
                >
                  <Button
                    type="button"
                    variant={selectedSources.includes(source) ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl capitalize"
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="relative h-[33rem] overflow-hidden rounded-[1.4rem] border border-border bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))]">
              <Conversation>
                <ConversationContent className="gap-6 px-4 py-5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {messages.length === 0 ? (
                      <motion.div
                        key="chat-empty"
                        layout
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={statusReveal}
                        transition={statusTransition}
                      >
                        <ConversationEmptyState
                          title="No messages yet"
                          description="Open an existing thread or start asking about inbox priorities, meetings, notes, or uploaded files."
                          icon={<Search className="size-5" />}
                        />
                      </motion.div>
                    ) : (
                      messages.map((message, index) => {
                        const text = messageText(message);
                        const reasoning = messageReasoning(message);
                        const citations = message.metadata?.citations ?? [];
                        const isUser = message.role === "user";

                        return (
                          <motion.article
                            layout
                            key={message.id}
                            className={cn("mx-auto w-full max-w-4xl space-y-2", isUser && "items-end")}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={listItemReveal}
                            transition={withStagger(index, 0.03)}
                          >
                            <div
                              className={cn(
                                "w-fit max-w-[92%] rounded-[1.2rem] border px-4 py-3 text-sm shadow-sm",
                                isUser
                                  ? "ml-auto border-primary/25 bg-primary text-primary-foreground"
                                  : "border-border bg-card text-foreground"
                              )}
                            >
                              <p className="whitespace-pre-wrap leading-6">{text || "..."}</p>
                            </div>

                            {!isUser && reasoning ? (
                              <Reasoning isStreaming={streamingMessageId === message.id}>
                                <ReasoningTrigger />
                                <ReasoningContent>{reasoning}</ReasoningContent>
                              </Reasoning>
                            ) : null}

                            {!isUser && citations.length > 0 ? (
                              <Sources>
                                <SourcesTrigger count={citations.length} />
                                <SourcesContent>
                                  {citations.map((citation: ChatCitation, idx: number) => (
                                    <Source
                                      key={`${citation.messageOrDocId}-${idx}`}
                                      href={citation.deepLink ?? "#"}
                                      title={`${citation.sourceType}: ${citation.snippet.slice(0, 80)}...`}
                                    >
                                      <span className="truncate text-left text-xs">
                                        {citation.sourceType}: {citation.snippet.slice(0, 120)}
                                        {citation.deepLink ? "" : " (no deep link)"}
                                      </span>
                                    </Source>
                                  ))}
                                </SourcesContent>
                              </Sources>
                            ) : null}
                          </motion.article>
                        );
                      })
                    )}

                    {showAssistantPlaceholder ? (
                      <motion.article
                        layout
                        key="assistant-pending"
                        className="mx-auto w-full max-w-4xl space-y-2"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={statusReveal}
                        transition={statusTransition}
                      >
                        <div className="inline-flex items-center gap-2 rounded-[1.1rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin text-blue-600" />
                          <span>Synthesizing response...</span>
                        </div>
                      </motion.article>
                    ) : null}
                  </AnimatePresence>
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>

            <PromptInput
              className="rounded-[1.4rem] border border-border bg-card p-2 shadow-sm"
              onSubmit={async (message) => {
                if (!message.text.trim() || !canSubmit) return;

                let conversationId = activeConversation?.id ?? null;
                if (!conversationId) {
                  const createdConversation = await createConversation();
                  conversationId = createdConversation?.id ?? null;
                }

                if (!conversationId) {
                  return;
                }

                await sendMessage(
                  {
                    text: message.text,
                    metadata: {
                      sourceTypes: selectedSources
                    }
                  },
                  {
                    body: {
                      conversationId,
                      sourceTypes: selectedSources
                    }
                  }
                );
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea placeholder="Ask about a contact, email, decision, note, or file..." />
              </PromptInputBody>
              <PromptInputFooter>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void createConversation();
                    }}
                    disabled={status === "streaming"}
                  >
                    New chat
                  </Button>
                  {activeConversation ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleDeleteConversation(activeConversation.id);
                      }}
                      disabled={status === "streaming"}
                    >
                      Delete chat
                    </Button>
                  ) : null}
                </div>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>

            <AnimatePresence mode="popLayout" initial={false}>
              {error || statusMessage ? (
                <motion.p
                  key={`chat-error-${error?.message ?? statusMessage}`}
                  layout
                  className="rounded-xl tone-danger px-3 py-2 text-sm"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={statusReveal}
                  transition={statusTransition}
                >
                  {error?.message ?? statusMessage}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.section>
  );
}
