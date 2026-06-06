export type TurnType = "question" | "follow_up" | "response" | "other";

export interface StructuredTurn {
  id: string;
  role: "assistant" | "user";
  rawText: string;
  type: TurnType;
  keyConcepts: string[];
  timestamp: number;
}

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","i","you","he","she","it","we","they",
  "this","that","and","or","but","in","on","at","to","for","of","with","can",
  "do","did","have","has","not","so","be","my","your","how","why","when",
  "where","which","just","also","about","what","would","could","should","then",
  "than","there","here","from","will","going","think","know","said","say",
  "get","let","like","right","now","okay","yes","no","please","student",
]);

const QUESTION_STARTERS = [
  "what","how","why","which","explain","describe","tell me","can you",
  "walk me","justify","prove","show","identify","what is","what are",
  "what was","what were","what does","what do",
];

function extractConcepts(text: string, rubricTerms: string[]): string[] {
  const found: Set<string> = new Set();
  const lower = text.toLowerCase();

  // Rubric terms take priority
  rubricTerms.forEach((term) => {
    if (term && lower.includes(term.toLowerCase())) {
      found.add(term.toLowerCase());
    }
  });

  // Fallback: significant words not in stopwords
  text.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).forEach((w) => {
    if (w.length > 5 && !STOPWORDS.has(w.toLowerCase())) {
      found.add(w.toLowerCase());
    }
  });

  return Array.from(found).slice(0, 6);
}

function isQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.endsWith("?")) return true;
  return QUESTION_STARTERS.some((s) => t.startsWith(s) || t.includes(` ${s} `));
}

export function classifyTurn(
  role: "assistant" | "user",
  rawText: string,
  rubricTerms: string[] = []
): Omit<StructuredTurn, "id" | "timestamp"> {
  const keyConcepts = extractConcepts(rawText, rubricTerms);

  if (role === "user") {
    return { role, rawText, type: "response", keyConcepts };
  }

  const type: TurnType = isQuestion(rawText) ? "question" : "follow_up";
  return { role, rawText, type, keyConcepts };
}

export function sessionNotesReducer(current: string, turn: StructuredTurn): string {
  const text = turn.rawText.trim();
  if (!text || text === "[inaudible]" || text === "[Transcribing...]") return current;

  const prefix =
    turn.role === "assistant"
      ? turn.type === "question"
        ? "Q:"
        : "AI:"
      : "Student:";

  const truncated = text.length > 120 ? text.slice(0, 117) + "..." : text;
  const line = `${prefix} ${truncated}`;
  // Fix 5: cap at 100 lines to prevent unbounded growth in long sessions
  const lines = current ? current.split("\n") : [];
  lines.push(line);
  return lines.slice(-100).join("\n");
}
