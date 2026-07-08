"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  isVisible: boolean;
  onClose: () => void;
  onClear: () => void;
}

const TYPING_CHARS_PER_TICK = 3;
const TYPING_INTERVAL_MS = 18;

/** Reveals `text` a few characters at a time; renders instantly once `animate` is false. */
function TypingText({
  text,
  animate,
  onDone,
}: {
  text: string;
  animate: boolean;
  onDone: () => void;
}) {
  const [visibleChars, setVisibleChars] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setVisibleChars(text.length);
      return;
    }

    setVisibleChars(0);
    const interval = setInterval(() => {
      setVisibleChars((prev) => {
        const next = Math.min(prev + TYPING_CHARS_PER_TICK, text.length);
        if (next >= text.length) {
          clearInterval(interval);
          onDone();
        }
        return next;
      });
    }, TYPING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [text]);

  return <>{text.slice(0, visibleChars)}</>;
}

export default function TranscriptPanel({
  messages,
  isVisible,
  onClose,
  onClear,
}: TranscriptPanelProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  // Message ids that have already finished (or skipped) their typing animation —
  // keeps committed messages from re-typing on re-render.
  const animatedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isVisible) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-card md:w-80 transition-all duration-300 ease-in-out">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" />
          Transcript
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-[10px] uppercase font-bold tracking-wider text-primary hover:text-primary/80 transition-colors px-2 py-1 bg-primary/10 rounded"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close transcript"
            title="Close transcript"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Transcript will appear here once the session starts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const alreadyAnimated = animatedIdsRef.current.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full shadow-sm">
                    {msg.role === "assistant" ? (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-bold text-primary/90">
                        AI
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                        ME
                      </div>
                    )}
                  </div>
                  <div className="max-w-[80%] flex flex-col gap-1">
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                        msg.role === "assistant"
                          ? "rounded-tl-sm bg-secondary text-secondary-foreground"
                          : "rounded-tr-sm bg-primary text-primary-foreground"
                      )}
                    >
                      <TypingText
                        text={msg.text}
                        animate={!alreadyAnimated}
                        onDone={() => animatedIdsRef.current.add(msg.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
