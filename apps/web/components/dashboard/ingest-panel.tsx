"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import {
  Copy,
  ExternalLink,
  FileText,
  LibraryBig,
  Link2,
  Loader2,
  NotebookPen,
  Search,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  overlayReveal,
  overlayTransition,
  panelReveal,
  panelTransition,
  statusReveal,
  withStagger,
} from "@/components/dashboard/motion-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { IngestionDocumentItem } from "@/lib/ingestion";
import { cn } from "@/lib/utils";

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function summarizeText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

function fullDocumentText(document: IngestionDocumentItem) {
  return (document.noteBody ?? document.rawText).trim();
}

function extractHost(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SectionIcon({
  sourceType,
}: {
  sourceType: IngestionDocumentItem["sourceType"];
}) {
  if (sourceType === "note") {
    return <NotebookPen className="size-4" />;
  }

  if (sourceType === "link") {
    return <Link2 className="size-4" />;
  }

  return <FileText className="size-4" />;
}

function sourceTone(sourceType: IngestionDocumentItem["sourceType"]) {
  if (sourceType === "note") {
    return {
      chip: "bg-amber-100 text-amber-900",
      accent: "text-amber-700",
      border: "border-amber-200/80",
      panel: "from-amber-50/95 via-white to-white",
    };
  }

  if (sourceType === "link") {
    return {
      chip: "bg-sky-100 text-sky-900",
      accent: "text-sky-700",
      border: "border-sky-200/80",
      panel: "from-sky-50/95 via-white to-white",
    };
  }

  return {
    chip: "bg-emerald-100 text-emerald-900",
    accent: "text-emerald-700",
    border: "border-emerald-200/80",
    panel: "from-emerald-50/95 via-white to-white",
  };
}

type LibraryFilter = "all" | IngestionDocumentItem["sourceType"];

export function IngestPanel({
  documents,
  initialSelectedDocumentId = null,
}: {
  documents: IngestionDocumentItem[];
  initialSelectedDocumentId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialSelectedDocumentId ?? documents[0]?.id ?? null
  );
  const lastSyncedInitialDocumentIdRef = useRef<string | null>(
    initialSelectedDocumentId ?? null
  );
  const deferredQuery = useDeferredValue(query);

  const noteDocuments = documents.filter(
    (document) => document.sourceType === "note"
  );
  const linkDocuments = documents.filter(
    (document) => document.sourceType === "link"
  );
  const uploadDocuments = documents.filter(
    (document) => document.sourceType === "upload"
  );
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredDocuments = documents.filter((document) => {
    if (activeFilter !== "all" && document.sourceType !== activeFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      document.title,
      document.sourceType,
      document.rawText,
      document.noteBody,
      document.externalUrl,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });

  const selectedDocument =
    filteredDocuments.find((document) => document.id === selectedDocumentId) ??
    filteredDocuments[0] ??
    null;
  const selectedTone = selectedDocument
    ? sourceTone(selectedDocument.sourceType)
    : null;
  const selectedHost = selectedDocument
    ? extractHost(selectedDocument.externalUrl)
    : null;

  useEffect(() => {
    if (!selectedDocument) {
      if (selectedDocumentId !== null) {
        setSelectedDocumentId(null);
      }
      return;
    }

    if (selectedDocument.id !== selectedDocumentId) {
      setSelectedDocumentId(selectedDocument.id);
    }
  }, [selectedDocument, selectedDocumentId]);

  useEffect(() => {
    const nextInitialDocumentId =
      initialSelectedDocumentId &&
      documents.some((document) => document.id === initialSelectedDocumentId)
        ? initialSelectedDocumentId
        : null;

    const didInitialSelectionChange =
      nextInitialDocumentId !== lastSyncedInitialDocumentIdRef.current;
    lastSyncedInitialDocumentIdRef.current = nextInitialDocumentId;

    if (didInitialSelectionChange && nextInitialDocumentId) {
      setSelectedDocumentId(nextInitialDocumentId);
      return;
    }

    setSelectedDocumentId((current) => {
      if (current && documents.some((document) => document.id === current)) {
        return current;
      }

      return documents[0]?.id ?? null;
    });
  }, [documents, initialSelectedDocumentId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentDocumentId = params.get("document");

    if (selectedDocumentId) {
      params.set("document", selectedDocumentId);
    } else {
      params.delete("document");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (
      (selectedDocumentId ?? null) !== (currentDocumentId ?? null) ||
      nextQuery !== currentQuery
    ) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, selectedDocumentId]);

  async function copySelectedDocumentLink() {
    if (!selectedDocument?.externalUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedDocument.externalUrl);
      toast.success("Deep link copied.");
    } catch {
      toast.error("Unable to copy deep link.");
    }
  }

  async function createNote() {
    if (!noteBody.trim()) return;
    setIsBusy(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: noteTitle || "Untitled note",
          body: noteBody,
        }),
      });
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      setNoteTitle("");
      setNoteBody("");
      router.refresh();
      toast.success("Note saved and queued for embedding.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Note failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function importLink() {
    if (!linkUrl.trim()) return;
    setIsBusy(true);
    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
      });
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      setLinkUrl("");
      router.refresh();
      toast.success("Link queued for extraction and embeddings.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Link import failed"
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadFile(file: File) {
    setIsBusy(true);
    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignResponse.ok) throw new Error("Unable to create upload URL");
      const presign = (await presignResponse.json()) as {
        objectKey: string;
        uploadUrl: string;
      };

      const putResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!putResponse.ok) throw new Error("Upload failed");

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: presign.objectKey,
          title: file.name,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      if (!completeResponse.ok) throw new Error("Upload completion failed");

      router.refresh();
      toast.success("Upload indexed and queued for processing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <motion.section
      id="ingest"
      initial="initial"
      animate="animate"
      variants={panelReveal}
      transition={panelTransition}
    >
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Ingestion</CardTitle>
          <CardDescription>
            Upload files, save notes, or ingest links for retrieval and
            automation.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-6">
          <motion.div
            initial="initial"
            animate="animate"
            variants={statusReveal}
            transition={withStagger(0, 0.05)}
            className="space-y-2 rounded-lg border border-border bg-muted/60 p-4"
          >
            <Label htmlFor="upload-input">Upload document (PDF/TXT/MD)</Label>
            <Input
              id="upload-input"
              type="file"
              accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
              disabled={isBusy}
            />
            <p className="text-xs text-muted-foreground">
              Files are stored, extracted, and queued for embeddings.
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            animate="animate"
            variants={statusReveal}
            transition={withStagger(1, 0.05)}
            className="grid gap-3 rounded-lg border border-border bg-muted/60 p-4"
          >
            <Label htmlFor="note-title">Note title</Label>
            <Input
              id="note-title"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Daily standup notes"
              disabled={isBusy}
            />
            <Label htmlFor="note-body">Note body</Label>
            <Textarea
              id="note-body"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              rows={5}
              placeholder="Capture ideas, follow-ups, or key decisions..."
              disabled={isBusy}
            />
            <Button type="button" onClick={createNote} disabled={isBusy}>
              Save note
            </Button>
          </motion.div>

          <motion.div
            initial="initial"
            animate="animate"
            variants={statusReveal}
            transition={withStagger(2, 0.05)}
            className="grid gap-3 rounded-lg border border-border bg-muted/60 p-4"
          >
            <Label htmlFor="link-url">Import link</Label>
            <Input
              id="link-url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com/article"
              disabled={isBusy}
            />
            <Button
              type="button"
              variant="outline"
              onClick={importLink}
              disabled={isBusy}
            >
              <Upload className="mr-2 size-4" />
              Queue link import
            </Button>
          </motion.div>

          <AnimatePresence mode="popLayout" initial={false}>
            {isBusy ? (
              <motion.div
                key="ingest-busy-overlay"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-card/60 backdrop-blur-[2px]"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={overlayReveal}
                transition={overlayTransition}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                  <Loader2 className="size-3.5 animate-spin text-blue-600" />
                  Processing ingestion...
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Card className="mt-6 border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <LibraryBig className="size-3.5" />
                Workspace sources
              </div>
              <CardTitle className="pt-2 text-xl">Document Library</CardTitle>
              <CardDescription>
                Search, filter, preview, and deep-link every note, link, and
                uploaded document in the workspace.
              </CardDescription>
            </div>
            <div className="grid min-w-[240px] flex-1 gap-2 sm:grid-cols-2 xl:max-w-xl xl:grid-cols-4">
              {[
                {
                  label: "All",
                  count: documents.length,
                  tone: "text-foreground",
                },
                {
                  label: "Notes",
                  count: noteDocuments.length,
                  tone: "text-amber-700",
                },
                {
                  label: "Links",
                  count: linkDocuments.length,
                  tone: "text-sky-700",
                },
                {
                  label: "Uploads",
                  count: uploadDocuments.length,
                  tone: "text-emerald-700",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-muted/55 px-3 py-2"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className={cn("mt-1 text-lg font-semibold", stat.tone)}>
                    {stat.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <InputGroup className="h-10 xl:max-w-md">
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Search className="size-4" />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, content, URLs, and source types"
              />
            </InputGroup>

            <Tabs
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as LibraryFilter)}
            >
              <TabsList
                variant="line"
                className="w-full justify-start xl:w-auto"
              >
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="note">Notes</TabsTrigger>
                <TabsTrigger value="link">Links</TabsTrigger>
                <TabsTrigger value="upload">Uploads</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)]">
            <div className="overflow-hidden rounded-[1.25rem] border border-border bg-muted/35 max-h-[75vh]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <LibraryBig className="size-4" />
                  Results
                </div>
                <Badge variant="secondary">{filteredDocuments.length}</Badge>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No documents match this search yet.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="grid gap-2 p-3">
                    {filteredDocuments.map((document) => {
                      const tone = sourceTone(document.sourceType);
                      const host = extractHost(document.externalUrl);

                      return (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => setSelectedDocumentId(document.id)}
                          className={cn(
                            "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                            "hover:border-border hover:bg-background/70",
                            selectedDocument?.id === document.id
                              ? `${tone.border} bg-background shadow-sm ring-1 ring-black/5`
                              : "border-transparent bg-background/50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              <div
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
                                  tone.chip
                                )}
                              >
                                <SectionIcon sourceType={document.sourceType} />
                                {document.sourceType}
                              </div>
                              <div className="truncate text-sm font-semibold text-foreground">
                                {document.title}
                              </div>
                              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {summarizeText(fullDocumentText(document))}
                              </p>
                            </div>
                            <div className="shrink-0 text-right text-xs text-muted-foreground">
                              <div>{formatCreatedAt(document.createdAt)}</div>
                              {host ? <div className="mt-1">{host}</div> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-[1.5rem] border border-border shadow-sm",
                selectedTone
                  ? `bg-gradient-to-b ${selectedTone.panel}`
                  : "bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,248,251,0.96))]"
              )}
            >
              {selectedDocument ? (
                <>
                  <div className="border-b border-border px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
                            selectedTone?.chip
                          )}
                        >
                          <SectionIcon
                            sourceType={selectedDocument.sourceType}
                          />
                          {selectedDocument.sourceType}
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-foreground">
                            {selectedDocument.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Added {formatCreatedAt(selectedDocument.createdAt)}
                            {selectedDocument.mimeType
                              ? ` | ${selectedDocument.mimeType}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.externalUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            render={
                              <Link
                                href={selectedDocument.externalUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                              />
                            }
                          >
                            <ExternalLink className="size-4" />
                            {selectedDocument.sourceType === "note"
                              ? "Open in workspace"
                              : "Open source"}
                          </Button>
                        ) : null}
                        {selectedDocument.externalUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void copySelectedDocumentLink()}
                          >
                            <Copy className="size-4" />
                            Copy deep link
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-[32rem]">
                    <div className="space-y-4 px-5 py-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Type
                          </div>
                          <div className="mt-1 text-sm font-medium capitalize text-foreground">
                            {selectedDocument.sourceType}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Added
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">
                            {formatCreatedAt(selectedDocument.createdAt)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Mime type
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">
                            {selectedDocument.mimeType ?? "text/plain"}
                          </div>
                        </div>
                      </div>

                      {selectedDocument.externalUrl ? (
                        <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {selectedDocument.sourceType === "note"
                              ? "Workspace deep link"
                              : "Source link"}
                          </div>
                          <Link
                            href={selectedDocument.externalUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-2 block break-all font-medium text-foreground underline underline-offset-4"
                          >
                            {selectedDocument.externalUrl}
                          </Link>
                          {selectedHost ? (
                            <p
                              className={cn(
                                "mt-2 text-xs font-medium uppercase tracking-[0.18em]",
                                selectedTone?.accent
                              )}
                            >
                              {selectedHost}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border bg-background/65 px-4 py-4">
                        <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                          {fullDocumentText(selectedDocument)}
                        </pre>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex h-[32rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Select a document to preview its full content.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
