import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVoicePreview, VOICE_PREVIEW_TEXT } from './useVoicePreview';

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  fireEnded() {
    this.onended?.();
  }
}

describe('useVoicePreview', () => {
  let fakeAudio: FakeAudio;

  beforeAll(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    fakeAudio = new FakeAudio();
    vi.stubGlobal('Audio', vi.fn(() => fakeAudio));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      }),
    );
  });

  it('plays an ElevenLabs voice preview via /api/tts/elevenlabs with the explicit voiceId', async () => {
    const { result } = renderHook(() => useVoicePreview());

    act(() => {
      result.current.play('elevenlabs', 'voice-1');
    });

    await waitFor(() => expect(result.current.playingId).toBe('voice-1'));
    expect(fetch).toHaveBeenCalledWith(
      '/api/tts/elevenlabs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: VOICE_PREVIEW_TEXT, voiceId: 'voice-1' }),
      }),
    );
  });

  it('plays an OpenAI voice preview via /api/speech/preview with the explicit voice id', async () => {
    const { result } = renderHook(() => useVoicePreview());

    act(() => {
      result.current.play('openai', 'ash');
    });

    await waitFor(() => expect(result.current.playingId).toBe('ash'));
    expect(fetch).toHaveBeenCalledWith(
      '/api/speech/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: VOICE_PREVIEW_TEXT, voice: 'ash' }),
      }),
    );
  });

  it('toggles off (stops) when the same voice is played again', async () => {
    const { result } = renderHook(() => useVoicePreview());

    act(() => {
      result.current.play('openai', 'ash');
    });
    await waitFor(() => expect(result.current.playingId).toBe('ash'));

    act(() => {
      result.current.play('openai', 'ash');
    });

    expect(result.current.playingId).toBeNull();
    expect(fakeAudio.pause).toHaveBeenCalled();
  });

  it('switches to the new voice, stopping the previous one, when a different voice is played', async () => {
    const { result } = renderHook(() => useVoicePreview());

    act(() => {
      result.current.play('openai', 'ash');
    });
    await waitFor(() => expect(result.current.playingId).toBe('ash'));
    const firstAudio = fakeAudio;

    act(() => {
      result.current.play('openai', 'coral');
    });
    await waitFor(() => expect(result.current.playingId).toBe('coral'));

    expect(firstAudio.pause).toHaveBeenCalled();
  });

  it('surfaces an error and clears state when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { result } = renderHook(() => useVoicePreview());

    act(() => {
      result.current.play('openai', 'ash');
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.playingId).toBeNull();
    expect(result.current.loadingId).toBeNull();
  });
});
