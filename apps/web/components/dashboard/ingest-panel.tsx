"use client";

import { startTransition, useState } from "react";

import { Loader2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  overlayReveal,
  overlayTransition,
  panelReveal,
  panelTransition,
  statusReveal,
  statusTransition,
  withStagger
} from "@/components/dashboard/motion-presets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function IngestPanel() {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [isBusy, setIsBusy] = useState(false);

  async function createNote() {
    if (!noteBody.trim()) return;
    setIsBusy(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: noteTitle || "Untitled note",
          body: noteBody
        })
      });
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      setNoteTitle("");
      setNoteBody("");
      setStatusTone("success");
      startTransition(() => setStatus("Note saved and queued for embedding."));
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Note failed");
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
        body: JSON.stringify({ url: linkUrl })
      });
      if (!response.ok) throw new Error(`Failed (${response.status})`);
      setLinkUrl("");
      setStatusTone("success");
      startTransition(() => setStatus("Link queued for extraction and embeddings."));
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Link import failed");
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
          contentType: file.type || "application/octet-stream"
        })
      });
      if (!presignResponse.ok) throw new Error("Unable to create upload URL");
      const presign = (await presignResponse.json()) as {
        objectKey: string;
        uploadUrl: string;
      };

      const putResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!putResponse.ok) throw new Error("Upload failed");

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: presign.objectKey,
          title: file.name,
          mimeType: file.type || "application/octet-stream"
        })
      });
      if (!completeResponse.ok) throw new Error("Upload completion failed");

      setStatusTone("success");
      startTransition(() => setStatus("Upload indexed and queued for processing."));
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Upload failed");
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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Ingestion</CardTitle>
          <CardDescription>
            Upload files, save notes, or ingest links for retrieval and automation.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-6">
          <motion.div
            initial="initial"
            animate="animate"
            variants={statusReveal}
            transition={withStagger(0, 0.05)}
            className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
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
            <p className="text-xs text-slate-500">Files are stored, extracted, and queued for embeddings.</p>
          </motion.div>

          <motion.div
            initial="initial"
            animate="animate"
            variants={statusReveal}
            transition={withStagger(1, 0.05)}
            className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
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
            className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
          >
            <Label htmlFor="link-url">Import link</Label>
            <Input
              id="link-url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com/article"
              disabled={isBusy}
            />
            <Button type="button" variant="outline" onClick={importLink} disabled={isBusy}>
              <Upload className="mr-2 size-4" />
              Queue link import
            </Button>
          </motion.div>

          <AnimatePresence mode="popLayout" initial={false}>
            {status ? (
              <motion.p
                key={`ingest-status-${statusTone}-${status}`}
                layout
                className={
                  statusTone === "error"
                    ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                }
                initial="initial"
                animate="animate"
                exit="exit"
                variants={statusReveal}
                transition={statusTransition}
              >
                {status}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {isBusy ? (
              <motion.div
                key="ingest-busy-overlay"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[2px]"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={overlayReveal}
                transition={overlayTransition}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                  <Loader2 className="size-3.5 animate-spin text-blue-600" />
                  Processing ingestion...
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.section>
  );
}
