import { config } from '@/lib/config';
import { resolveAvatarConfig } from '@/lib/avatarConfig';
import type {
  EphemeralTokenResponse,
  SessionAvatarConfig,
  SessionEphemeralBundle,
} from '@/types/types';

export { parseSessionRunAvatar, resolveAvatarConfig } from '@/lib/avatarConfig';
export {
  getAvatarModeLabel,
  getEffectiveRenderType,
  isHeyGenEnabled,
  shouldUseHeyGenVideo,
} from '@/lib/heygenConfig';

export async function fetchSessionEphemeral(
  sessionId: string,
  sessionRunId: string,
  options: {
    token?: string | null;
    fallbackAvatar?: Partial<SessionAvatarConfig>;
  } = {},
): Promise<SessionEphemeralBundle> {
  const url = new URL(config.getApiUrl('/api/session/ephemeral'));
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('session_run_id', sessionRunId);

  const headers: HeadersInit = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(body.detail ?? `Ephemeral token failed (${response.status})`);
  }

  const data = (await response.json()) as EphemeralTokenResponse;
  const openaiToken =
    data.openai_token ?? data.client_secret?.value ?? '';

  if (!openaiToken) {
    throw new Error('Ephemeral response missing OpenAI token');
  }

  return {
    openaiToken,
    realtimeModel: data.realtime_model ?? 'gpt-realtime-2',
    avatar: resolveAvatarConfig(data, options.fallbackAvatar),
  };
}
