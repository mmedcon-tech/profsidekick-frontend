import type { AvatarWidgetState } from '@/types/types';

export interface AvatarStateInput {
  isConnected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
}

export function deriveAvatarWidgetState(
  input: AvatarStateInput,
): AvatarWidgetState {
  if (!input.isConnected) return 'idle';
  if (input.isAISpeaking) return 'speaking';
  if (input.isUserSpeaking) return 'listening';
  return 'idle';
}
