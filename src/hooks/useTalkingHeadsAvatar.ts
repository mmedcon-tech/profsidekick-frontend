'use client';

import { useEffect, useState } from 'react';
import type { SessionAvatarConfig } from '@/types/types';

export interface TalkingHeadsAvatarState {
  status: 'idle' | 'unavailable';
  error: string | null;
}

/** Stub until TalkingHeads provider credentials are available. */
export function useTalkingHeadsAvatar(
  config: SessionAvatarConfig | null,
  enabled: boolean,
): TalkingHeadsAvatarState {
  const [state, setState] = useState<TalkingHeadsAvatarState>({
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    if (!enabled || !config || config.renderType !== 'talkingheads') {
      setState({ status: 'idle', error: null });
      return;
    }
    setState({
      status: 'unavailable',
      error: 'TalkingHeads integration pending — using animated static fallback.',
    });
  }, [config, enabled]);

  return state;
}
