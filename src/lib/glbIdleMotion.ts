/**
 * Gentle left-right Y rotation (radians) so the model feels alive without leaving frame.
 *
 * `idleStrength` (0–1) scales the sway. Passing a smoothly-eased value (rather than a
 * hard on/off boolean) is important: toggling the sway abruptly while the speaking
 * state flickers makes the whole body appear to vibrate. Callers should ramp this
 * toward 0 while speaking and back to 1 when idle.
 */
export function computeSidewaysIdleRotation(elapsed: number, idleStrength = 1): number {
  const strength = Math.max(0, Math.min(1, idleStrength));
  return Math.sin(elapsed * 0.22) * 0.07 * strength;
}
