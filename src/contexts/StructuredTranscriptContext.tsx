"use client";

import React, { createContext, useContext, useState, useCallback, FC, PropsWithChildren } from "react";
import { v4 as uuidv4 } from "uuid";
import { StructuredTurn, sessionNotesReducer } from "@/lib/turnClassifier";

interface StructuredTranscriptContextValue {
  currentQuestion: string | null;
  latestResponse: string | null;
  keyConcepts: string[];
  rollingNotes: string;
  structuredTurns: StructuredTurn[];
  addStructuredTurn: (turn: Omit<StructuredTurn, "id" | "timestamp">) => void;
  clearStructured: () => void;
}

const StructuredTranscriptContext = createContext<StructuredTranscriptContextValue | undefined>(undefined);

export const StructuredTranscriptProvider: FC<PropsWithChildren> = ({ children }) => {
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [rollingNotes, setRollingNotes] = useState<string>("");
  const [structuredTurns, setStructuredTurns] = useState<StructuredTurn[]>([]);

  const addStructuredTurn = useCallback((turn: Omit<StructuredTurn, "id" | "timestamp">) => {
    const full: StructuredTurn = { ...turn, id: uuidv4(), timestamp: Date.now() };

    setStructuredTurns((prev) => [...prev, full]);

    if (turn.role === "assistant") {
      setCurrentQuestion(turn.rawText);
    } else if (turn.role === "user") {
      setLatestResponse(turn.rawText);
    }

    if (turn.keyConcepts.length > 0) {
      // Fix 7: append novel concepts rather than prepending, so established concepts are not
      // evicted from the visible panel as the session matures.
      setKeyConcepts((prev) => {
        const existing = new Set(prev.map(c => c.toLowerCase()));
        const novel = turn.keyConcepts.filter(c => !existing.has(c.toLowerCase()));
        return [...prev, ...novel].slice(0, 12);
      });
    }

    setRollingNotes((prev) => sessionNotesReducer(prev, full));
  }, []);

  const clearStructured = useCallback(() => {
    setCurrentQuestion(null);
    setLatestResponse(null);
    setKeyConcepts([]);
    setRollingNotes("");
    setStructuredTurns([]);
  }, []);

  return (
    <StructuredTranscriptContext.Provider
      value={{ currentQuestion, latestResponse, keyConcepts, rollingNotes, structuredTurns, addStructuredTurn, clearStructured }}
    >
      {children}
    </StructuredTranscriptContext.Provider>
  );
};

export function useStructuredTranscript() {
  const ctx = useContext(StructuredTranscriptContext);
  if (!ctx) throw new Error("useStructuredTranscript must be used within StructuredTranscriptProvider");
  return ctx;
}
