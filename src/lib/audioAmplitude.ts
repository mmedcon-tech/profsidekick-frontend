/** Normalize AnalyserNode frequency data to 0–1 for avatar lip-sync. */
export function computeNormalizedAmplitude(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    sum += data[i];
  }
  return Math.min(1, sum / data.length / 128);
}
