import { config } from '@/lib/config';
import type { SlideData } from '@/types/types';

export interface RagChunk {
  slide_number: number | null;
  chunk_index: number;
  content: string;
  score: number | null;
  source: 'slide' | 'course_material' | string;
}

export interface RagSearchResult {
  results: RagChunk[];
}

/** Search all indexed session slides and course materials for relevant chunks. */
export async function searchSessionKnowledge(
  sessionId: string,
  query: string,
  options: { token?: string | null; courseId?: string | null; topK?: number } = {},
): Promise<RagChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const body: Record<string, string> = { query: trimmed };
  if (options.courseId) {
    body.course_id = options.courseId;
  }

  const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/search`), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn('RAG search failed:', response.status, await response.text());
    return [];
  }

  const data = (await response.json()) as RagSearchResult;
  return data.results ?? [];
}

/** Format retrieved chunks as a system message for the realtime session. */
export function formatRagContextMessage(
  query: string,
  chunks: RagChunk[],
  currentSlideIndex: number,
  slides: SlideData[],
): string {
  const current = slides[currentSlideIndex];
  const currentLabel = current
    ? `Slide ${currentSlideIndex + 1}: "${current.title}"`
    : `Slide ${currentSlideIndex + 1}`;

  const currentDetail = current?.content?.trim().slice(0, 800) || 'No extracted content on this slide.';

  if (chunks.length === 0) {
    return [
      '[Knowledge retrieval — no matching chunks found]',
      `Learner question: ${query}`,
      `Current on-screen position (supplementary context only): ${currentLabel}`,
      currentDetail,
      'Answer using the full session if you know it from prior turns. If the material does not contain the answer, say so clearly.',
    ].join('\n\n');
  }

  const sourceBlocks = chunks
    .map((chunk, index) => {
      const label =
        chunk.source === 'course_material'
          ? 'course material'
          : chunk.slide_number != null
            ? `slide ${chunk.slide_number}`
            : 'session content';
      return `<source index="${index + 1}" origin="${label}" score="${chunk.score ?? 'n/a'}">\n${chunk.content}\n</source>`;
    })
    .join('\n\n');

  return [
    '[Retrieved knowledge — search covered ALL indexed session slides and course materials]',
    `Learner question: ${query}`,
    'Use the retrieved sources below as the primary factual basis for your answer.',
    'You may cite any slide or material below, even if it is not the slide currently on screen.',
    'Use prior conversation turns for follow-up context (pronouns, continuity).',
    `Current on-screen slide (supplementary context only — NOT a search filter): ${currentLabel}`,
    currentDetail,
    sourceBlocks,
  ].join('\n\n');
}

export function buildRagSystemEvent(contextMessage: string): Record<string, unknown> {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'system',
      content: [{ type: 'input_text', text: contextMessage }],
    },
  };
}
