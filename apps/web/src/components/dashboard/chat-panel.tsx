"use client";

import { startTransition, useDeferredValue, useState } from "react";

import type { SourceType } from "@syntheci/shared";

const sourceOptions: SourceType[] = ["gmail", "slack", "note", "upload", "link"];

interface ChatCitation {
  sourceType: SourceType;
  sourceId: string;
  messageOrDocId: string;
  snippet: string;
  deepLink: string | null;
}

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const deferredQuestion = useDeferredValue(question);
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [citations, setCitations] = useState<ChatCitation[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleSource(source: SourceType) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((it) => it !== source) : [...prev, source]
    );
  }

  function clear() {
    setAnswer("");
    setCitations([]);
    setError(null);
  }

  async function submit() {
    if (!deferredQuestion.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          question: deferredQuestion,
          sourceTypes: selectedSources
        })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        answer: string;
        citations: ChatCitation[];
      };

      startTransition(() => {
        setAnswer(payload.answer);
        setCitations(payload.citations ?? []);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown chat error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Knowledge Chat</h2>
        <span className="badge">RAG + citations</span>
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        placeholder="Ask about emails, Slack, notes, uploads, and links..."
        style={{
          width: "100%",
          resize: "vertical",
          padding: "0.8rem",
          borderRadius: 12,
          border: "1px solid #334155",
          background: "#0b1220",
          color: "inherit"
        }}
      />

      <div className="row" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {sourceOptions.map((source) => (
          <button
            key={source}
            type="button"
            className="btn secondary"
            onClick={() => toggleSource(source)}
            style={{
              borderColor: selectedSources.includes(source) ? "#22c55e" : undefined
            }}
          >
            {source}
          </button>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn" onClick={submit} disabled={isLoading}>
          {isLoading ? "Thinking..." : "Ask"}
        </button>
        <button type="button" className="btn secondary" onClick={clear}>
          Clear
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      {answer ? (
        <div className="panel" style={{ background: "#0b1220" }}>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{answer}</p>
          <h3>Citations</h3>
          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
            {citations.map((citation, idx) => (
              <li key={`${citation.messageOrDocId}-${idx}`} style={{ marginBottom: "0.6rem" }}>
                <strong>{citation.sourceType}</strong>: {citation.snippet}
                {citation.deepLink ? (
                  <>
                    {" "}
                    <a href={citation.deepLink} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
