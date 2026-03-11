"use client";

import { useMemo, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { isReasoningUIPart, isTextUIPart, type ChatStatus, type UIMessage } from "ai";
import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ChatCitation, SourceType } from "@syntheci/shared";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listItemReveal,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { cn } from "@/lib/utils";

const sourceOptions: SourceType[] = ["gmail", "note", "upload", "link"];

interface ChatMetadata {
  sourceTypes?: SourceType[];
  citations?: ChatCitation[];
}

type ChatMessage = UIMessage<ChatMetadata>;

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

export function ChatPanel() {
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);

  const { messages, sendMessage, setMessages, status, stop, error, regenerate } = useChat<ChatMessage>();

  const canSubmit = status !== "submitted" && status !== "streaming";

  const streamingMessageId = useMemo(() => {
    if (status !== "streaming") return null;
    return [...messages].reverse().find((message) => message.role === "assistant")?.id ?? null;
  }, [messages, status]);
  const showAssistantPlaceholder =
    status === "submitted" || (status === "streaming" && !streamingMessageId);

  function toggleSource(source: SourceType) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]
    );
  }

  return (
    <motion.section
      id="chat"
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">Knowledge Chat</CardTitle>
              <CardDescription>
                Ask grounded questions across inbox, notes, uploads, and links.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-blue-200 bg-blue-50 text-blue-700">
                <Sparkles className="mr-1 size-3.5" />
                Streaming RAG
              </Badge>
              <Badge variant="outline" className="border-slate-300 text-slate-600">
                {selectedSources.length === 0 ? "All sources" : `${selectedSources.length} source filters`}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {sourceOptions.map((source, index) => (
                <motion.div
                  key={source}
                  layout
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={listItemReveal}
                  transition={withStagger(index, 0.04)}
                >
                  <Button
                    type="button"
                    variant={selectedSources.includes(source) ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative h-[30rem] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <Conversation>
              <ConversationContent>
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
                        description="Start with a question about priority threads, meetings, or docs."
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
                          className={cn("mx-auto w-full max-w-3xl space-y-2", isUser && "items-end")}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          variants={listItemReveal}
                          transition={withStagger(index, 0.03)}
                        >
                          <div
                            className={cn(
                              "w-fit max-w-[90%] rounded-xl border px-4 py-3 text-sm shadow-sm",
                              isUser
                                ? "ml-auto border-blue-200 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-800"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{text || "..."}</p>
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
                                {citations.map((citation, idx) => (
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
                      className="mx-auto w-full max-w-3xl space-y-2"
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={statusReveal}
                      transition={statusTransition}
                    >
                      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
            className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
            onSubmit={async (message) => {
              if (!message.text.trim() || !canSubmit) return;

              await sendMessage(
                {
                  text: message.text,
                  metadata: {
                    sourceTypes: selectedSources
                  }
                },
                {
                  body: {
                    sourceTypes: selectedSources
                  }
                }
              );
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea placeholder="Ask about an email, decision, note, or file..." />
            </PromptInputBody>
            <PromptInputFooter>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMessages([])}
                  disabled={messages.length === 0 || status === "streaming"}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void regenerate()}
                  disabled={messages.length === 0 || status === "streaming"}
                >
                  Regenerate
                </Button>
              </div>
              <PromptInputSubmit status={status as ChatStatus} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>

          <AnimatePresence mode="popLayout" initial={false}>
            {error ? (
              <motion.p
                key="chat-error"
                layout
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                {error.message}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.section>
  );
}
