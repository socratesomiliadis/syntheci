"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useChat } from "@ai-sdk/react";
import { isReasoningUIPart, isTextUIPart } from "ai";
import {
  BookUser,
  Edit3,
  FileText,
  Filter,
  Globe2,
  Loader2,
  Mail,
  Menu,
  MessageSquarePlus,
  NotebookPen,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type {
  ChatCitation,
  ChatConversationDetail,
  ChatConversationSummary,
  SourceType,
} from "@syntheci/shared";

import { Markdown } from "@/components/ai-elements/markdown";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger,
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toUIMessage, type ChatMessage } from "@/lib/chat-ui";
import { cn } from "@/lib/utils";

const sourceOptions: Array<{
  description: string;
  label: string;
  value: SourceType;
}> = [
  { value: "gmail", label: "Inbox", description: "Messages and threads" },
  { value: "note", label: "Notes", description: "Manual workspace notes" },
  {
    value: "upload",
    label: "Uploads",
    description: "Files and extracted docs",
  },
  { value: "link", label: "Links", description: "Imported webpages" },
  {
    value: "contact",
    label: "Contacts",
    description: "People and relationship context",
  },
];

function sourceTypeLabel(sourceType: SourceType) {
  return (
    sourceOptions.find((option) => option.value === sourceType)?.label ??
    sourceType
  );
}

function sourceTypeTone(sourceType: SourceType) {
  if (sourceType === "gmail") return "bg-rose-100 text-rose-900";
  if (sourceType === "note") return "bg-amber-100 text-amber-900";
  if (sourceType === "upload") return "bg-emerald-100 text-emerald-900";
  if (sourceType === "link") return "bg-sky-100 text-sky-900";
  return "bg-violet-100 text-violet-900";
}

function SourceTypeIcon({ sourceType }: { sourceType: SourceType }) {
  if (sourceType === "gmail") return <Mail className="size-4" />;
  if (sourceType === "note") return <NotebookPen className="size-4" />;
  if (sourceType === "upload") return <FileText className="size-4" />;
  if (sourceType === "link") return <Globe2 className="size-4" />;
  return <BookUser className="size-4" />;
}

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
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;
  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error
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
  onCreateConversation,
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/80 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Threads</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {conversations.length === 0
                ? "No saved threads yet"
                : `${conversations.length} saved thread${
                    conversations.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>
          <Button
            size="icon-sm"
            className="rounded-xl"
            onClick={onCreateConversation}
            aria-label="New chat"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {conversations.length === 0 ? (
            <motion.div
              key="chat-rail-empty"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={statusReveal}
              transition={statusTransition}
              className="rounded-[1rem] border border-dashed border-border bg-background px-3 py-5 text-sm text-muted-foreground"
            >
              Start a conversation to build a reusable thread library.
            </motion.div>
          ) : (
            conversations.map((conversation, index) => {
              const isActive = conversation.id === activeConversationId;
              const isEditing = editingConversationId === conversation.id;

              return (
                <motion.article
                  key={conversation.id}
                  layout
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={listItemReveal}
                  transition={withStagger(index, 0.03)}
                  className={cn(
                    "group mb-1.5 rounded-[1.1rem] border px-3 py-3 transition-colors",
                    isActive
                      ? "border-info/30 bg-info/10 shadow-sm"
                      : "border-transparent bg-background hover:border-border/80 hover:bg-muted/45"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editingTitle}
                        onChange={(event) =>
                          onEditingTitleChange(event.target.value)
                        }
                        className="h-8 rounded-lg border-border bg-background text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          onClick={() => onSaveRename(conversation.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={onCancelRename}
                        >
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {conversation.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {conversation.preview ?? "No messages yet"}
                            </p>
                          </div>
                          {isLoadingConversation && isActive ? (
                            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
                      </button>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {conversation.latestMessageAt
                            ? new Date(
                                conversation.latestMessageAt
                              ).toLocaleDateString()
                            : "Empty"}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-1 transition-opacity",
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          )}
                        >
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
                            onClick={() =>
                              onDeleteConversation(conversation.id)
                            }
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
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ChatPanel({
  initialConversations,
  initialConversation,
}: {
  initialConversations: ChatConversationSummary[];
  initialConversation: ChatConversationDetail | null;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversation, setActiveConversation] =
    useState<ChatConversationDetail | null>(initialConversation);
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status, stop, error } =
    useChat<ChatMessage>({
      id: activeConversation?.id ?? "chat",
      messages: initialConversation
        ? initialConversation.messages.map(toUIMessage)
        : [],
      onFinish: () => {
        void refreshConversations();
      },
    });

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setActiveConversation(initialConversation);
    setMessages(
      initialConversation ? initialConversation.messages.map(toUIMessage) : []
    );
  }, [initialConversation, setMessages]);

  useEffect(() => {
    if (error?.message) {
      toast.error(error.message);
    }
  }, [error]);

  useEffect(() => {
    if (statusMessage) {
      toast.error(statusMessage);
    }
  }, [statusMessage]);

  const streamingMessageId = useMemo(() => {
    if (status !== "streaming") return null;
    return (
      [...messages].reverse().find((message) => message.role === "assistant")
        ?.id ?? null
    );
  }, [messages, status]);

  async function refreshConversations() {
    const response = await fetch("/api/chat/conversations", {
      cache: "no-store",
    });
    const payload = await readJson<{
      conversations: ChatConversationSummary[];
    }>(response);

    startTransition(() => {
      setConversations(payload.conversations);
      if (activeConversation) {
        const refreshedActive = payload.conversations.find(
          (item) => item.id === activeConversation.id
        );
        if (refreshedActive) {
          setActiveConversation((current) =>
            current
              ? {
                  ...current,
                  title: refreshedActive.title,
                  createdAt: refreshedActive.createdAt,
                  updatedAt: refreshedActive.updatedAt,
                  latestMessageAt: refreshedActive.latestMessageAt,
                  preview: refreshedActive.preview,
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
      const response = await fetch(
        `/api/chat/conversations/${conversationId}`,
        { cache: "no-store" }
      );
      const conversation = await readJson<ChatConversationDetail>(response);

      startTransition(() => {
        setActiveConversation(conversation);
        setMessages(conversation.messages.map(toUIMessage));
        router.replace(`/dashboard/chat?conversation=${conversationId}`, {
          scroll: false,
        });
        setRailOpen(false);
      });
    } catch (loadError) {
      setStatusMessage(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load conversation."
      );
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
        body: JSON.stringify({}),
      });
      const conversation = await readJson<ChatConversationSummary>(response);
      const detail: ChatConversationDetail = { ...conversation, messages: [] };

      startTransition(() => {
        setConversations((current) => [
          conversation,
          ...current.filter((item) => item.id !== conversation.id),
        ]);
        setActiveConversation(detail);
        setMessages([]);
        setSelectedSources([]);
        router.replace(`/dashboard/chat?conversation=${conversation.id}`, {
          scroll: false,
        });
        setRailOpen(false);
      });

      return detail;
    } catch (createError) {
      setStatusMessage(
        createError instanceof Error
          ? createError.message
          : "Unable to create chat."
      );
      return null;
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!window.confirm("Delete this conversation permanently?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}`,
        { method: "DELETE" }
      );
      await readJson<{ ok: true }>(response);

      const remaining = conversations.filter(
        (conversation) => conversation.id !== conversationId
      );
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
      setStatusMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete conversation."
      );
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
      const response = await fetch(
        `/api/chat/conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        }
      );
      const conversation = await readJson<ChatConversationSummary>(response);

      startTransition(() => {
        setConversations((current) =>
          current.map((item) =>
            item.id === conversation.id ? conversation : item
          )
        );
        setActiveConversation((current) =>
          current && current.id === conversation.id
            ? { ...current, title: conversation.title }
            : current
        );
        setEditingConversationId(null);
        setEditingTitle("");
      });
    } catch (renameError) {
      setStatusMessage(
        renameError instanceof Error
          ? renameError.message
          : "Unable to rename conversation."
      );
    }
  }

  function toggleSource(source: SourceType) {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((item) => item !== source)
        : [...prev, source]
    );
  }

  const canSubmit = status !== "submitted" && status !== "streaming";
  const activeConversationId = activeConversation?.id ?? null;
  const showAssistantPlaceholder =
    status === "submitted" || (status === "streaming" && !streamingMessageId);
  const activeConversationLabel = activeConversation?.title ?? "New chat";
  const activeFilterSummary =
    selectedSources.length === 0
      ? "Searching all connected context"
      : `Scoped to ${selectedSources.map(sourceTypeLabel).join(", ")}`;

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
    <motion.section
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="grid h-full min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-sm xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(244,247,249,0.86))] xl:flex xl:flex-col">
          {rail}
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.96))]">
          <div className="border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-sm md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="xl:hidden">
                    <Sheet open={railOpen} onOpenChange={setRailOpen}>
                      <SheetTrigger
                        render={
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          />
                        }
                      >
                        <Menu className="size-4" />
                        Threads
                      </SheetTrigger>
                      <SheetContent
                        side="left"
                        className="w-[92vw] max-w-sm p-0"
                      >
                        <SheetHeader className="sr-only">
                          <SheetTitle>Chat threads</SheetTitle>
                        </SheetHeader>
                        {rail}
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt- rounded-[1.35rem] border border-border/80 bg-muted/35 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <Filter className="size-3.5" />
                  Filters
                </div>
                {selectedSources.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="rounded-full"
                    onClick={() => setSelectedSources([])}
                  >
                    <X className="size-3" />
                    Clear filters
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    All sources included
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {sourceOptions.map((source, index) => {
                  const isActive = selectedSources.includes(source.value);

                  return (
                    <motion.div
                      key={source.value}
                      initial="initial"
                      animate="animate"
                      variants={listItemReveal}
                      transition={withStagger(index, 0.035)}
                    >
                      <Button
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-auto min-h-9 rounded-full px-3 py-2 text-left",
                          isActive ? "shadow-sm" : "bg-background/85"
                        )}
                        onClick={() => toggleSource(source.value)}
                      >
                        <SourceTypeIcon sourceType={source.value} />
                        <span className="text-[0.8rem] font-medium">
                          {source.label}
                        </span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <Conversation className="h-full min-h-0">
                <ConversationContent className="mx-auto w-full max-w-[90%] gap-6 px-4 py-5 md:px-6">
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
                        className="flex min-h-[22rem] items-center justify-center"
                      >
                        <ConversationEmptyState
                          className="rounded-[1.6rem] border border-dashed border-border bg-background/70"
                          title="Start with a grounded question"
                          description="Ask about inbox priorities, meeting proposals, notes, uploads, or contacts. Every answer can cite back to the workspace."
                          icon={<Search className="size-5" />}
                        />
                      </motion.div>
                    ) : (
                      messages.map((message, index) => {
                        const text = messageText(message);
                        const reasoning = messageReasoning(message);
                        const citations = message.metadata?.citations ?? [];
                        const isUser = message.role === "user";
                        const isStreamingMessage =
                          streamingMessageId === message.id;

                        return (
                          <motion.article
                            layout
                            key={message.id}
                            className="w-full"
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={listItemReveal}
                            transition={withStagger(index, 0.03)}
                          >
                            {isUser ? (
                              <div className="flex justify-end">
                                <div className="max-w-[min(40rem,88%)] space-y-2">
                                  <div className="pr-1 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                    You
                                  </div>
                                  <div className="rounded-[1.6rem] bg-primary px-4 py-3.5 text-sm text-primary-foreground shadow-sm">
                                    <p className="whitespace-pre-wrap leading-7">
                                      {text || "..."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold uppercase tracking-[0.22em] text-info shadow-sm sm:inline-flex">
                                  AI
                                </div>
                                <div className="min-w-0 max-w-[min(46rem,100%)] flex-1 space-y-3">
                                  <div className="flex flex-wrap items-center gap-2 pl-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                      Syntheci
                                    </span>
                                    {citations.length > 0 ? (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full px-2.5 py-1 text-muted-foreground"
                                      >
                                        {citations.length} source
                                        {citations.length === 1 ? "" : "s"}
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="rounded-[1.75rem] border border-border/80 bg-card/95 px-5 py-4 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.25)]">
                                    <Markdown isStreaming={isStreamingMessage}>
                                      {text || "..."}
                                    </Markdown>
                                  </div>

                                  {reasoning ? (
                                    <div className="max-w-[min(46rem,100%)] pl-1">
                                      <Reasoning
                                        isStreaming={isStreamingMessage}
                                      >
                                        <ReasoningTrigger />
                                        <ReasoningContent>
                                          {reasoning}
                                        </ReasoningContent>
                                      </Reasoning>
                                    </div>
                                  ) : null}

                                  {citations.length > 0 ? (
                                    <div className="max-w-[min(46rem,100%)] pl-1">
                                      <Sources>
                                        <SourcesTrigger
                                          count={citations.length}
                                        />
                                        <SourcesContent>
                                          {citations.map(
                                            (
                                              citation: ChatCitation,
                                              idx: number
                                            ) => (
                                              <Source
                                                key={`${citation.messageOrDocId}-${idx}`}
                                                href={citation.deepLink}
                                                title={`${
                                                  citation.sourceType
                                                }: ${citation.snippet.slice(
                                                  0,
                                                  80
                                                )}...`}
                                              >
                                                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                  <SourceTypeIcon
                                                    sourceType={
                                                      citation.sourceType
                                                    }
                                                  />
                                                </span>
                                                <span className="min-w-0 flex-1 space-y-2">
                                                  <span className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                      variant="secondary"
                                                      className={cn(
                                                        "rounded-full border-0 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]",
                                                        sourceTypeTone(
                                                          citation.sourceType
                                                        )
                                                      )}
                                                    >
                                                      {sourceTypeLabel(
                                                        citation.sourceType
                                                      )}
                                                    </Badge>
                                                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                      {citation.deepLink
                                                        ? "Deep linked"
                                                        : "Preview only"}
                                                    </span>
                                                  </span>
                                                  <span className="block text-sm leading-6 text-foreground">
                                                    {citation.snippet.slice(
                                                      0,
                                                      180
                                                    )}
                                                    {citation.snippet.length >
                                                    180
                                                      ? "..."
                                                      : ""}
                                                  </span>
                                                </span>
                                              </Source>
                                            )
                                          )}
                                        </SourcesContent>
                                      </Sources>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </motion.article>
                        );
                      })
                    )}

                    {showAssistantPlaceholder ? (
                      <motion.article
                        layout
                        key="assistant-pending"
                        className="w-full"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={statusReveal}
                        transition={statusTransition}
                      >
                        <div className="flex gap-3">
                          <div className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold uppercase tracking-[0.22em] text-info shadow-sm sm:inline-flex">
                            AI
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-[1.3rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin text-blue-600" />
                            <span>Synthesizing grounded answer...</span>
                          </div>
                        </div>
                      </motion.article>
                    ) : null}
                  </AnimatePresence>
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>
            </div>

            <div className="border-t border-border/80 bg-background/82 px-4 py-3 backdrop-blur-sm md:px-6 shrink-0 h-24">
              <div className="mx-auto max-w-4xl h-full">
                {/* <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{activeFilterSummary}</span>
                  <span>Enter to send · Shift+Enter for newline</span>
                </div> */}

                <PromptInput
                  className="h-full"
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
                          sourceTypes: selectedSources,
                        },
                      },
                      {
                        body: {
                          conversationId,
                          sourceTypes: selectedSources,
                        },
                      }
                    );
                  }}
                >
                  <PromptInputBody className="h-full">
                    <PromptInputTextarea
                      className="h-full"
                      placeholder="Ask about a decision, person, thread, note, or document..."
                    />
                    <PromptInputSubmit
                      status={status}
                      onStop={stop}
                      className="rounded-full"
                      size="icon-sm"
                    />
                  </PromptInputBody>
                  {/* <PromptInputFooter className="items-center border-t border-border/60 px-2 pt-2">
                    <div className="pl-1 text-xs text-muted-foreground">
                      Answers stay grounded in inbox, notes, uploads, links, and contacts.
                    </div>
                    <PromptInputSubmit
                      status={status}
                      onStop={stop}
                      className="rounded-full"
                      size="icon-sm"
                    />
                  </PromptInputFooter> */}
                </PromptInput>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
