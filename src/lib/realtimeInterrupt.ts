import type { RealtimeClientSend } from '@/lib/learnerSlideRealtimeNotify';

export interface InterruptActiveResponseOptions {
  send: RealtimeClientSend;
  /** Item id of the assistant message currently being spoken, if any. */
  activeAssistantItemId: string | null;
  /** performance.now() timestamp for when that item's audio started playing. */
  audioStartedAtMs: number | null;
  /** Injectable for tests; defaults to the real clock. */
  now?: number;
}

/**
 * Stops the tutor mid-speech. `response.cancel` alone only stops future
 * generation — audio already queued into the WebRTC output pipeline keeps
 * playing. `output_audio_buffer.clear` is the WebRTC-transport-specific
 * Realtime event that actually clears that in-flight audio (same fix already
 * proven in TeachingInterface.tsx's notifyAIOfSlideChange). The truncate call
 * trims the conversation item to what the learner actually heard, so later
 * turns don't treat unheard text as something the learner heard.
 */
export function interruptActiveResponse({
  send,
  activeAssistantItemId,
  audioStartedAtMs,
  now = performance.now(),
}: InterruptActiveResponseOptions): void {
  send({ type: 'response.cancel' }, 'interrupt.response_cancel');
  send({ type: 'output_audio_buffer.clear' }, 'interrupt.clear_audio_buffer');

  if (activeAssistantItemId !== null && audioStartedAtMs !== null) {
    const audioEndMs = Math.max(0, Math.round(now - audioStartedAtMs));
    send(
      {
        type: 'conversation.item.truncate',
        item_id: activeAssistantItemId,
        content_index: 0,
        audio_end_ms: audioEndMs,
      },
      'interrupt.truncate_item',
    );
  }
}

export interface ResumeInterruptedResponseOptions {
  send: RealtimeClientSend;
}

/**
 * The cancelled response can't be resumed verbatim (OpenAI discards it), so
 * resuming means nudging the model to continue teaching from where it left
 * off rather than repeating itself.
 */
export function resumeInterruptedResponse({ send }: ResumeInterruptedResponseOptions): void {
  send(
    {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [
          {
            type: 'input_text',
            text:
              "The learner interrupted you and has just let you continue. Resume teaching naturally from where you left off — don't repeat what you already said and don't mention the interruption.",
          },
        ],
      },
    },
    'interrupt.resume_message',
  );
  send({ type: 'response.create' }, 'interrupt.resume_response');
}
