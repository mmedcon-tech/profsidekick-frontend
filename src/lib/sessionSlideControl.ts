import type { SlideData } from '@/types/types';

export type SessionMode = 'teaching' | 'examination' | 'consultation';

/** Realtime API tool definitions for avatar-driven slide navigation. */
export function buildSlideNavigationTools(): Array<{
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };
}> {
  return [
    {
      type: 'function',
      name: 'nextSlide',
      description:
        'Advance the on-screen slide to the next one. Call this ONLY after you have completely finished teaching the current slide aloud — never call it mid-sentence or while still explaining the current slide. The slide will not change until you call this tool.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'previousSlide',
      description: 'Go back to the previous slide when the learner asks to review earlier material.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: 'function',
      name: 'goToSlide',
      description: 'Jump directly to a specific slide number (1-indexed) when referencing or revisiting content.',
      parameters: {
        type: 'object',
        properties: {
          slideNumber: {
            type: 'number',
            description: 'The slide number to navigate to (1-indexed)',
          },
        },
        required: ['slideNumber'],
        additionalProperties: false,
      },
    },
  ];
}

export interface AiLeadPromptOptions {
  slides: SlideData[];
  sessionMode: SessionMode;
  currentSlideIndex: number;
  publisherInstructions?: string;
}

const ragFirstPolicy = `KNOWLEDGE & RETRIEVAL RULES (critical):
- For EVERY learner question, search across ALL indexed session slides and course materials — never limit retrieval to the slide currently on screen.
- Retrieved chunks (injected as system messages) are your primary factual source. You may answer from any slide or uploaded material when relevant.
- The current on-screen slide is SUPPLEMENTARY context only (where the learner is looking). It is NOT a retrieval filter.
- Use prior conversation turns for follow-ups, pronouns, and continuity.
- If retrieved material does not contain the answer, say so clearly rather than guessing.
- When an answer comes from a different slide, you may call goToSlide(n) to show it, or answer without navigating — use your judgment.`;

/** System prompt layered on top of backend session instructions for AI-led navigation. */
export function buildAiLeadSystemPrompt({
  slides,
  sessionMode,
  currentSlideIndex,
  publisherInstructions,
}: AiLeadPromptOptions): string {
  const total = slides.length;
  const current = slides[currentSlideIndex];
  const currentLabel = current
    ? `Slide ${currentSlideIndex + 1} of ${total}: "${current.title}"`
    : `Slide ${currentSlideIndex + 1} of ${total}`;

  const currentSlide = slides[currentSlideIndex];
  const currentDetail = currentSlide
    ? currentSlide.content?.trim().slice(0, 600) || 'No extracted content'
    : 'No extracted content';

  const deckOutline = slides
    .map((slide, index) => `${index + 1}. ${slide.title}${index === currentSlideIndex ? ' (on screen now)' : ''}`)
    .join('\n');

  const teachingLead = `You are leading an interactive teaching session.

${ragFirstPolicy}

SLIDE NAVIGATION (UI sync):
- When actively teaching sequentially, focus spoken explanation on the current slide, then call nextSlide() when finished — or wait for the learner to press Next.
- The learner can change slides at any time; when they do, you will receive an update — adapt immediately.
- Use previousSlide() or goToSlide(n) when revisiting or when an answer references another slide.

CURRENT ON-SCREEN SLIDE (supplementary — not a retrieval boundary):
${currentLabel}

CURRENT SLIDE CONTENT:
${currentDetail}

FULL DECK OUTLINE:
${deckOutline}`;

  const examinationLead = `You are conducting an oral examination.

${ragFirstPolicy}

Use slide navigation tools to reference specific slides when asking questions. Do not lecture through the deck unless the learner asks for clarification.

CURRENT ON-SCREEN SLIDE (supplementary):
${currentLabel}`;

  const consultationLead = `You are in a course consultation session — an expert advisor helping the learner understand the material.

${ragFirstPolicy}

Answer questions clearly using retrieved knowledge from the full course. Reference slides when helpful.

CURRENT ON-SCREEN SLIDE (supplementary):
${currentLabel}`;

  const modeBlock =
    sessionMode === 'examination'
      ? examinationLead
      : sessionMode === 'consultation'
        ? consultationLead
        : teachingLead;

  const publisherBlock = publisherInstructions?.trim()
    ? `\n\nPUBLISHER INSTRUCTIONS:\n${publisherInstructions.trim()}`
    : '';

  return `${modeBlock}${publisherBlock}`;
}

/** Kickoff message sent once when the session connects. */
export function buildSessionKickoffMessage(
  currentSlideIndex: number,
  slideTitle: string,
  sessionMode: SessionMode,
): string {
  if (sessionMode === 'examination') {
    return `The session is starting on slide ${currentSlideIndex + 1} ("${slideTitle}"). Greet the learner, explain the examination format, and begin questioning. Use the full indexed material when formulating questions — not only this slide.`;
  }

  if (sessionMode === 'consultation') {
    return `The session is starting on slide ${currentSlideIndex + 1} ("${slideTitle}"). Welcome the learner to the consultation. Introduce what you can help with, then begin discussing this slide. For any question, search and use knowledge from the entire uploaded material — not just the current slide.`;
  }

  return `The session is starting on slide ${currentSlideIndex + 1} ("${slideTitle}"). Welcome the learner briefly, then teach this slide's content. When they ask questions, answer using the FULL indexed material (any slide or course document). The current slide is where they are looking — not a limit on what you may retrieve.`;
}

export type LearnerSlideChangeAction = 'next' | 'previous' | 'jump';

/** Message sent to the realtime session when the learner changes slides manually. */
export function buildLearnerSlideChangeMessage(
  slideIndex: number,
  slides: SlideData[],
  action: LearnerSlideChangeAction,
): string {
  const slide = slides[slideIndex];
  const title = slide?.title ?? `Slide ${slideIndex + 1}`;
  const content = slide?.content?.trim().slice(0, 500) || 'No extracted content for this slide.';
  const actionLabel =
    action === 'next'
      ? 'pressed Next'
      : action === 'previous'
        ? 'pressed Previous'
        : 'jumped to this slide';

  return [
    `The learner ${actionLabel} and is now on slide ${slideIndex + 1} of ${slides.length}: "${title}".`,
    `This slide is now on screen (supplementary context). Continue using the FULL indexed material for any questions.`,
    `CURRENT SLIDE CONTENT:`,
    content,
    `Acknowledge the slide change briefly, then teach or discuss this slide. For questions, still retrieve from all slides and course materials.`,
  ].join('\n');
}

/** Extract publisher-editable instructions from the stored JSON/string format. */
export function parsePublisherInstructions(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as {
        editable?: string;
        sessionBehavior?: { sessionInstructions?: string };
      };
      const parts = [
        parsed.editable?.trim(),
        parsed.sessionBehavior?.sessionInstructions?.trim(),
      ].filter(Boolean);
      return parts.join('\n');
    } catch {
      return '';
    }
  }
  return raw.trim();
}

export function buildSlideToolResultData(
  slides: SlideData[],
  currentIndex: number,
  previousIndex: number,
): {
  previousSlide: number;
  currentSlide: number;
  slideTitle: string;
  slideContent: string;
} {
  const slide = slides[currentIndex];
  return {
    previousSlide: previousIndex + 1,
    currentSlide: currentIndex + 1,
    slideTitle: slide?.title ?? 'Unknown',
    slideContent: slide?.content?.trim().slice(0, 600) ?? '',
  };
}
