/** Gentle left-right Y rotation (radians) so the model feels alive without leaving frame. */
export function computeSidewaysIdleRotation(elapsed: number): number {
  return Math.sin(elapsed * 0.22) * 0.07;
}
