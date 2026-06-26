import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface AiMessageProps {
  content: string;
  className?: string;
}

// Matches a LaTeX command, superscript/subscript, or \frac-style structure —
// used to tell a bare [...] math expression apart from a markdown link/reference.
const LATEX_HINT = /\\[a-zA-Z]+|\^\{|_\{|\^\d|_\d/;

/**
 * remark-math only recognizes $...$ / $$...$$. Some LLMs (and our own prompts)
 * occasionally emit \[...\], \(...\), or bare [...] for math instead. Normalize
 * those into dollar-delimited math before handing off to remark-math, so they
 * render instead of showing up as literal LaTeX source.
 */
function normalizeMathDelimiters(text: string): string {
  let out = text;

  // \[ ... \] -> $$ ... $$ (display math)
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => `$$${inner}$$`);

  // \( ... \) -> $ ... $ (inline math)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, inner) => `$${inner}$`);

  // Bare [ ... ] -> $ ... $, but only when it looks like math (has a LaTeX
  // command/sub/superscript) and isn't a markdown link/reference (not
  // followed by "(" or ":").
  out = out.replace(/\[([^\[\]]+)\](?!\s*[(:])/g, (match, inner) =>
    LATEX_HINT.test(inner) ? `$${inner}$` : match,
  );

  return out;
}

/** Single rendering path for all AI-generated text: Markdown + LaTeX (KaTeX). */
export default function AiMessage({ content, className }: AiMessageProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
}
