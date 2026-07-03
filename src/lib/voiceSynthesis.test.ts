import { describe, expect, it, vi, beforeEach } from 'vitest';
import { synthesizeAssistantSpeech } from './voiceSynthesis';
import { playElevenLabsSpeech, ElevenLabsSynthesisError } from '@/lib/playElevenLabsAudio';
import { playOpenAiTtsSpeech } from '@/lib/openaiTtsSpeech';
import type { SpeechDispatch } from '@/lib/speechDispatch';

vi.mock('@/lib/playElevenLabsAudio', async () => {
  const actual = await vi.importActual('@/lib/playElevenLabsAudio');
  return { ...actual, playElevenLabsSpeech: vi.fn() };
});
vi.mock('@/lib/openaiTtsSpeech', () => ({ playOpenAiTtsSpeech: vi.fn() }));

const mockElevenLabs = vi.mocked(playElevenLabsSpeech);
const mockOpenAi = vi.mocked(playOpenAiTtsSpeech);

function fakeAudio(): { stop: () => void; audio: HTMLAudioElement; timeline: { keyframes: []; duration: number } } {
  return { stop: vi.fn(), audio: {} as HTMLAudioElement, timeline: { keyframes: [], duration: 0 } };
}

const ELEVENLABS_DISPATCH: SpeechDispatch = {
  provider: 'elevenlabs',
  voiceId: 'rachel',
  gender: 'female',
  voiceProfile: 'adult',
};

const OPENAI_DISPATCH: SpeechDispatch = {
  provider: 'openai',
  voiceId: 'nova',
  gender: 'female',
  voiceProfile: 'adult',
};

describe('synthesizeAssistantSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays through OpenAI directly when dispatched to openai', async () => {
    mockOpenAi.mockResolvedValue(fakeAudio());

    const result = await synthesizeAssistantSpeech('Hello', OPENAI_DISPATCH, vi.fn());

    expect(mockElevenLabs).not.toHaveBeenCalled();
    expect(mockOpenAi).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Hello', voiceId: 'nova' }),
    );
    expect(result.providerUsed).toBe('openai');
    expect(result.fallbackReason).toBeUndefined();
  });

  it('plays through ElevenLabs directly when it succeeds', async () => {
    mockElevenLabs.mockResolvedValue(fakeAudio());

    const result = await synthesizeAssistantSpeech('Hello', ELEVENLABS_DISPATCH, vi.fn());

    expect(mockOpenAi).not.toHaveBeenCalled();
    expect(result.providerUsed).toBe('elevenlabs');
    expect(result.fallbackReason).toBeUndefined();
  });

  it('falls back to OpenAI when ElevenLabs fails with a platform quota error, and reports the fallback', async () => {
    mockElevenLabs.mockRejectedValue(
      new ElevenLabsSynthesisError('quota exceeded', 'platform_quota_exceeded'),
    );
    mockOpenAi.mockResolvedValue(fakeAudio());

    const result = await synthesizeAssistantSpeech('Hello', ELEVENLABS_DISPATCH, vi.fn());

    expect(mockOpenAi).toHaveBeenCalledTimes(1);
    expect(result.providerUsed).toBe('openai'); // billing must use this, not the original dispatch
    expect(result.fallbackReason).toBe('platform_unavailable');
  });

  it('falls back to OpenAI for any ElevenLabs failure, not only classified quota errors', async () => {
    mockElevenLabs.mockRejectedValue(new Error('network blip'));
    mockOpenAi.mockResolvedValue(fakeAudio());

    const result = await synthesizeAssistantSpeech('Hello', ELEVENLABS_DISPATCH, vi.fn());

    expect(result.providerUsed).toBe('openai');
    expect(result.fallbackReason).toBe('platform_unavailable');
  });

  it('propagates the error if the OpenAI fallback also fails', async () => {
    mockElevenLabs.mockRejectedValue(new Error('platform down'));
    mockOpenAi.mockRejectedValue(new Error('openai also down'));

    await expect(
      synthesizeAssistantSpeech('Hello', ELEVENLABS_DISPATCH, vi.fn()),
    ).rejects.toThrow('openai also down');
  });
});
