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
    .map((slide, index) => {
      if (index === currentSlideIndex) {
        return `→ ${index + 1}. ${slide.title} (CURRENT — on screen now)`;
      }
      return `${index + 1}. ${slide.title} (locked — call nextSlide() before teaching this)`;
    })
    .join('\n');

  const teachingLead = `You are leading an interactive teaching session. The learner sees ONE slide on screen at a time. YOU must change what they see using your navigation tools.

SLIDE NAVIGATION RULES (critical — violations break the UI):
- You may ONLY teach content for the CURRENT on-screen slide (${currentLabel}).
- Do NOT summarize or teach future slides while still on the current slide.
- After you finish teaching the current slide aloud, you MUST call nextSlide() as your last action before stopping.
- Saying "next slide" out loud does NOT change the screen — only calling nextSlide() does.
- NEVER call nextSlide() while you are still explaining the current slide.
- The on-screen slide only changes when you call nextSlide() — the learner sees a mismatch if you call it too early.
- Do NOT wait for the learner to say "next slide".
- If the learner interrupts with a question, answer it, then resume or call nextSlide() when ready.
- Use previousSlide() or goToSlide(n) when revisiting earlier material.
- The on-screen slide must always match what you are teaching.

CURRENT POSITION: ${currentLabel}

CURRENT SLIDE CONTENT (only source you may teach right now):
${currentDetail}

DECK OUTLINE (titles only — details unlock after nextSlide()):
${deckOutline}`;

  const examinationLead = `You are conducting an oral examination. Use slide navigation tools to reference specific slides when asking questions, but do not lecture or teach through the deck sequentially unless the learner asks for clarification.

CURRENT POSITION: ${currentLabel}`;

  const consultationLead = `You are in a consultation session. Use slide navigation tools to reference relevant slides as you discuss the material with the learner.

CURRENT POSITION: ${currentLabel}`;

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
    return `The session is starting on slide ${currentSlideIndex + 1} ("${slideTitle}"). Greet the learner, explain the examination format, and begin questioning based on the current slide.`;
  }

  return `The session is starting on slide ${currentSlideIndex + 1} ("${slideTitle}"). Welcome the learner briefly, teach ONLY this slide's content, then call nextSlide() before moving on. Repeat: teach one slide → call nextSlide() → teach the next. Never discuss slide ${currentSlideIndex + 2} or later until you have called nextSlide().`;
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
