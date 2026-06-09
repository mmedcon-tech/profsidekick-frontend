import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { message, context, history = [] } = await req.json();

  const systemPrompt = [
    'You are a helpful AI training assistant named Salama.',
    'You help subscribers navigate their courses, answer content questions, and stay motivated.',
    'Keep answers concise, warm, and conversational — 2-3 sentences unless the user asks for detail.',
    context ? `Context: ${context}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const messages = [
    { role: 'system', content: systemPrompt },
    // Include recent history (max 6 turns = 3 exchanges)
    ...history.slice(-6).map((m: { role: string; text: string }) => ({
      role: m.role,
      content: m.text,
    })),
    { role: 'user', content: message },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 250 }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'OpenAI error' }, { status: 502 });
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? 'Sorry, I could not respond right now.';
  return NextResponse.json({ reply });
}
