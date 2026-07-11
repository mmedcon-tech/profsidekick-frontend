import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantChatBody {
  message?: string;
  systemPrompt?: string;
  history?: ChatHistoryItem[];
  /** Live call mode — shorter, faster replies. */
  responseMode?: 'call' | 'chat';
}

const CALL_MODE_SUFFIX =
  ' Reply in one or two short spoken sentences (under 35 words). No lists or markdown.';

async function proxyToBackend(body: AssistantChatBody): Promise<Response | null> {
  try {
    const response = await fetch(config.getApiUrl('/api/assistant/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 404 || response.status === 501) {
      return null;
    }

    return response;
  } catch {
    return null;
  }
}

async function callOpenAI(
  apiKey: string,
  body: AssistantChatBody,
  message: string,
): Promise<NextResponse> {
  const isCall = body.responseMode === 'call';
  const basePrompt =
    body.systemPrompt?.trim() ||
    'You are a helpful AI training assistant for ProfSidekick subscribers.';
  const messages = [
    {
      role: 'system' as const,
      content: isCall ? `${basePrompt}${CALL_MODE_SUFFIX}` : basePrompt,
    },
    ...(body.history ?? []).slice(isCall ? -4 : -8).map((item) => ({
      role: item.role,
      content: item.text,
    })),
    { role: 'user' as const, content: message },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: isCall ? 90 : 400,
      temperature: isCall ? 0.55 : 0.7,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const detail =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : 'OpenAI request failed';
    return NextResponse.json({ error: detail }, { status: res.status });
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return NextResponse.json({ error: 'Empty model response' }, { status: 502 });
  }

  return NextResponse.json({ reply });
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: AssistantChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  try {
    if (apiKey) {
      return await callOpenAI(apiKey, body, message);
    }

    const backendResponse = await proxyToBackend(body);
    if (backendResponse) {
      const data = await backendResponse.json().catch(() => ({}));
      if (backendResponse.ok && data.reply) {
        return NextResponse.json({ reply: data.reply });
      }

      const detail =
        typeof data?.detail === 'string'
          ? data.detail
          : typeof data?.error === 'string'
            ? data.error
            : 'Assistant unavailable';
      return NextResponse.json({ error: detail }, { status: backendResponse.status });
    }

    return NextResponse.json(
      {
        error:
          'OPENAI_API_KEY is not configured. Set it in .env.local or start the backend API with a key.',
      },
      { status: 503 },
    );
  } catch (error) {
    console.error('assistant/chat error:', error);
    return NextResponse.json({ error: 'Failed to reach OpenAI' }, { status: 500 });
  }
}
