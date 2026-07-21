'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssistantAvatar } from '@/hooks/useAssistantAvatar';
import {
  getAlternatePlatformAvatarId,
  getPlatformAssistantAvatar,
  getPlatformPortraitSrc,
  readStoredAssistantPlatformAvatarId,
  writeStoredAssistantPlatformAvatarId,
  type AssistantPlatformAvatarId,
} from '@/lib/assistantPlatformAvatars';

export interface AssistantPlatformAvatarState {
  activeId: AssistantPlatformAvatarId;
  avatar: AssistantAvatar;
  portraitSrc: string;
  alternateId: AssistantPlatformAvatarId;
  alternatePortraitSrc: string;
  alternateName: string;
  toggleAvatar: () => void;
  setAvatarId: (id: AssistantPlatformAvatarId) => void;
}

export function useAssistantPlatformAvatar(
  language: 'en' | 'ar' = 'en',
): AssistantPlatformAvatarState {
  const [activeId, setActiveId] = useState<AssistantPlatformAvatarId>('avatar-1');

  useEffect(() => {
    setActiveId(readStoredAssistantPlatformAvatarId());
  }, []);

  const alternateId = getAlternatePlatformAvatarId(activeId);

  const avatar = useMemo(
    () => getPlatformAssistantAvatar(activeId, language),
    [activeId, language],
  );

  const portraitSrc = getPlatformPortraitSrc(activeId);
  const alternatePortraitSrc = getPlatformPortraitSrc(alternateId);
  const alternateName =
    alternateId === 'avatar-2'
      ? language === 'ar'
        ? 'سلطان'
        : 'Sultan'
      : language === 'ar'
        ? 'سلامة'
        : 'Salama';

  const setAvatarId = useCallback((id: AssistantPlatformAvatarId) => {
    setActiveId(id);
    writeStoredAssistantPlatformAvatarId(id);
  }, []);

  const toggleAvatar = useCallback(() => {
    setAvatarId(alternateId);
  }, [alternateId, setAvatarId]);

  return {
    activeId,
    avatar,
    portraitSrc,
    alternateId,
    alternatePortraitSrc,
    alternateName,
    toggleAvatar,
    setAvatarId,
  };
}
