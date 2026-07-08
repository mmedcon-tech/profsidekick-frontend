/**
 * Normalize AnalyserNode frequency data to 0–1 for avatar lip-sync.
 *
 * Speech energy concentrates in ~200–4000 Hz. Weighting those bins and applying
 * a gentle power curve produces mouth movement that tracks real audio far better
 * than a flat average across the full spectrum.
 */
export function computeNormalizedAmplitude(data: Uint8Array): number {
  if (data.length === 0) return 0;

  const startBin = Math.max(1, Math.floor(data.length * 0.03));
  const endBin = Math.min(data.length - 1, Math.ceil(data.length * 0.45));

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = startBin; i <= endBin; i += 1) {
    const t = (i - startBin) / Math.max(1, endBin - startBin);
    const weight = 0.55 + 0.45 * Math.sin(t * Math.PI);
    weightedSum += data[i] * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return 0;

  const normalized = weightedSum / weightTotal / 255;
  const boosted = Math.pow(normalized, 0.72) * 1.35;
  return Math.min(1, Math.max(0, boosted));
}

/** RMS from time-domain audio samples — tracks speech envelopes more tightly than FFT bins. */
export function computeWaveformAmplitude(data: Uint8Array): number {
  if (data.length === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < data.length; i += 1) {
    const sample = (data[i] - 128) / 128;
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / data.length);
  const boosted = Math.pow(rms, 0.82) * 2.8;
  return Math.min(1, Math.max(0, boosted));
}
