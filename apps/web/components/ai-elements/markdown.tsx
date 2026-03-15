"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

const markdownPlugins = { cjk, code, math, mermaid };

export function Markdown({
  children,
  className,
  isStreaming = false
}: {
  children: string;
  className?: string;
  isStreaming?: boolean;
}) {
  return (
    <Streamdown
      className={cn("chat-markdown", className)}
      isAnimating={isStreaming}
      mode={isStreaming ? "streaming" : "static"}
      plugins={markdownPlugins}
    >
      {children}
    </Streamdown>
  );
}
