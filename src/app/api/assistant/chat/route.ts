import { NextResponse } from 'next/server';

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantChatBody {
  message?: string;
  systemPrompt?: string;
  history?: ChatHistoryItem[];
}

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server' },
      { status: 503 },
    );
  }

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

  const messages = [
    {
      role: 'system' as const,
      content:
        body.systemPrompt?.trim() ||
        'You are a helpful AI training assistant for ProfSidekick subscribers.',
    },
    ...(body.history ?? []).slice(-8).map((item) => ({
      role: item.role,
      content: item.text,
    })),
    { role: 'user' as const, content: message },
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        max_completion_tokens: 400,
        temperature: 0.7,
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
  } catch (error) {
    console.error('assistant/chat error:', error);
    return NextResponse.json({ error: 'Failed to reach OpenAI' }, { status: 500 });
  }
}
