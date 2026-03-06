"use client";

import { startTransition, useState } from "react";

export function IngestPanel() {
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
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
      startTransition(() => setStatus("Note saved and queued for embedding."));
    } catch (error) {
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
      startTransition(() => setStatus("Link queued for extraction and embeddings."));
    } catch (error) {
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

      startTransition(() => setStatus("Upload indexed and queued for processing."));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Ingestion</h2>
        <span className="badge">notes + links + uploads</span>
      </div>

      <div className="grid">
        <label htmlFor="upload-input">Upload (PDF/TXT/MD)</label>
        <input
          id="upload-input"
          type="file"
          accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadFile(file);
            }
          }}
          disabled={isBusy}
        />
      </div>

      <div className="grid">
        <label htmlFor="note-title">Note title</label>
        <input
          id="note-title"
          value={noteTitle}
          onChange={(event) => setNoteTitle(event.target.value)}
          placeholder="Daily standup notes"
          style={{ padding: "0.6rem", borderRadius: 10, border: "1px solid #334155" }}
          disabled={isBusy}
        />
        <label htmlFor="note-body">Note body</label>
        <textarea
          id="note-body"
          value={noteBody}
          onChange={(event) => setNoteBody(event.target.value)}
          rows={4}
          placeholder="Capture ideas, follow-ups, or key decisions..."
          style={{ padding: "0.6rem", borderRadius: 10, border: "1px solid #334155" }}
          disabled={isBusy}
        />
        <button type="button" className="btn" onClick={createNote} disabled={isBusy}>
          Save note
        </button>
      </div>

      <div className="grid">
        <label htmlFor="link-url">Import link</label>
        <input
          id="link-url"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder="https://example.com/article"
          style={{ padding: "0.6rem", borderRadius: 10, border: "1px solid #334155" }}
          disabled={isBusy}
        />
        <button type="button" className="btn secondary" onClick={importLink} disabled={isBusy}>
          Queue link import
        </button>
      </div>

      {status ? <p className="muted">{status}</p> : null}
    </section>
  );
}
