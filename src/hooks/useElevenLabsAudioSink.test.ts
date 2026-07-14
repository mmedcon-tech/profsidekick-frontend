import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useElevenLabsAudioSink } from './useElevenLabsAudioSink';

class FakeAudio {
  src = '';
  paused = true;
  private listeners: Record<string, Array<() => void>> = {};

  addEventListener(type: string, handler: () => void) {
    (this.listeners[type] ??= []).push(handler);
  }
  removeEventListener(type: string, handler: () => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((h) => h !== handler);
  }
  removeAttribute() {
    this.src = '';
  }
  load() {}
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause() {
    this.paused = true;
  }
  fireEnded() {
    (this.listeners['ended'] || []).forEach((h) => h());
  }
}

describe('useElevenLabsAudioSink', () => {
  let fakeAudio: FakeAudio;

  // Stubbed once for the whole file (not per-test) because jsdom has no
  // Blob-URL support at all: if this were unstubbed before a hook's cleanup
  // effect runs (which happens on unmount, i.e. in @testing-library/react's
  // own afterEach — ordered after this file's), `stop()`'s
  // `URL.revokeObjectURL` call would throw against the real, missing API.
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
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      }),
    );
  });

  it('synthesizes and plays a pushed clause, reporting speaking state', async () => {
    const onSpeakingChange = vi.fn();
    const { result } = renderHook(() =>
      useElevenLabsAudioSink({ voiceId: 'voice-1', onSpeakingChange }),
    );

    act(() => {
      result.current.push('Hello there.');
    });

    await waitFor(() => expect(fakeAudio.play).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      '/api/tts/elevenlabs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'Hello there.', voiceId: 'voice-1' }),
      }),
    );
    expect(onSpeakingChange).toHaveBeenCalledWith(true);

    await act(async () => {
      fakeAudio.fireEnded();
      await Promise.resolve();
    });

    await waitFor(() => expect(onSpeakingChange).toHaveBeenLastCalledWith(false));
  });

  it('stop() clears the queue and pauses immediately without playing further clauses', async () => {
    const onSpeakingChange = vi.fn();
    const { result } = renderHook(() =>
      useElevenLabsAudioSink({ voiceId: 'voice-1', onSpeakingChange }),
    );

    act(() => {
      result.current.push('First clause.');
      result.current.push('Second clause.');
    });

    await waitFor(() => expect(fakeAudio.play).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.stop();
    });

    expect(fakeAudio.paused).toBe(true);
    expect(onSpeakingChange).toHaveBeenLastCalledWith(false);

    // Even if the in-flight clause's audio were to fire "ended" after stop(),
    // no further queued clause should be picked up.
    await act(async () => {
      fakeAudio.fireEnded();
      await Promise.resolve();
    });
    expect(fakeAudio.play).toHaveBeenCalledTimes(1);
  });
});
