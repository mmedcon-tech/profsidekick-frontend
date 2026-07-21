'use client';

/** Tracks live loudness from a playing HTMLAudioElement (0–1). */
export interface AudioLevelMeter {
  getLevel: () => number;
  dispose: () => void;
}

export function attachAudioLevelMeter(audio: HTMLAudioElement): AudioLevelMeter {
  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioCtx) {
    return { getLevel: () => 0, dispose: () => {} };
  }

  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.72;
  const data = new Uint8Array(analyser.frequencyBinCount);
  const source = ctx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const resume = (): void => {
    if (ctx.state === 'suspended') void ctx.resume();
  };
  audio.addEventListener('play', resume);

  return {
    getLevel: (): number => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      const voiceBandEnd = Math.min(data.length, 48);
      for (let i = 2; i < voiceBandEnd; i += 1) sum += data[i];
      const avg = sum / Math.max(1, voiceBandEnd - 2) / 255;
      return Math.min(1, Math.pow(avg, 0.75) * 1.65);
    },
    dispose: (): void => {
      audio.removeEventListener('play', resume);
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
    },
  };
}
