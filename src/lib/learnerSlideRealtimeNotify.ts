import {
  buildAiLeadSystemPrompt,
  buildLearnerSlideChangeMessage,
  parsePublisherInstructions,
  type LearnerSlideChangeAction,
  type SessionMode,
} from '@/lib/sessionSlideControl';
import type { SlideData } from '@/types/types';

export type RealtimeClientSend = (event: Record<string, unknown>, suffix?: string) => void;

export interface LearnerSlideRealtimeNotifyOptions {
  send: RealtimeClientSend;
  slides: SlideData[];
  slideIndex: number;
  action: LearnerSlideChangeAction;
  sessionMode: SessionMode;
  publisherInstructions?: string;
}

/**
 * Tell the realtime tutor that the learner changed slides manually.
 * Cancels any in-flight speech, refreshes session instructions, injects a user
 * turn with the new slide content, then requests a spoken response.
 */
export function notifyLearnerSlideChangeToRealtime({
  send,
  slides,
  slideIndex,
  action,
  sessionMode,
  publisherInstructions,
}: LearnerSlideRealtimeNotifyOptions): void {
  const slideMessage = buildLearnerSlideChangeMessage(slideIndex, slides, action);
  const refreshedInstructions = buildAiLeadSystemPrompt({
    slides,
    sessionMode,
    currentSlideIndex: slideIndex,
    publisherInstructions,
  });

  send({ type: 'response.cancel' }, 'slide.learner.cancel');
  send({ type: 'output_audio_buffer.clear' }, 'slide.learner.clear_audio');

  send(
    {
      type: 'session.update',
      session: { instructions: refreshedInstructions },
    },
    'slide.learner.context_update',
  );

  window.setTimeout(() => {
    send(
      {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: slideMessage }],
        },
      },
      'slide.learner.message',
    );

    window.setTimeout(() => {
      send(
        {
          type: 'response.create',
          response: {
            instructions:
              'The learner just changed slides. Acknowledge briefly, then teach or discuss the new slide. For questions, search and use knowledge from the entire uploaded material — the current slide is supplementary context only.',
          },
        },
        'slide.learner.response',
      );
    }, 200);
  }, 150);
}
