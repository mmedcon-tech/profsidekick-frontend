/** Detect when the assistant verbally signals a slide change (without a tool call). */
export function detectSlideAdvanceFromSpeech(
  transcript: string,
  currentIndex: number,
  slideCount: number,
): number | null {
  if (slideCount <= 0 || currentIndex >= slideCount - 1) return null;

  const text = transcript.toLowerCase().trim();
  if (!text) return null;

  const explicitPatterns = [
    /\b(?:moving to|let'?s|let us) (?:look at|go to|turn to) slide\s+(\d+)\b/,
    /\bnow (?:let'?s |let us )?(?:look at|move to|go to) slide\s+(\d+)\b/,
  ];

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (match) {
      const target = Number.parseInt(match[1], 10) - 1;
      if (target > currentIndex && target >= 0 && target < slideCount) {
        return target;
      }
    }
  }

  const nextSlidePhrases = [
    /\bnext slide\b/,
    /\bmove (?:on )?to the next slide\b/,
    /\bgo to the next slide\b/,
    /\bonto the next slide\b/,
    /\blet'?s move on\b/,
    /\blet'?s proceed\b/,
    /\bmoving on to (?:the )?next\b/,
    /\bnow (?:let'?s |let us )?(?:look at|move to|go to) slide\s+\d+\b/,
  ];

  if (nextSlidePhrases.some((re) => re.test(text))) {
    return currentIndex + 1;
  }

  return null;
}

export function extractRealtimeToolCalls(serverEvent: {
  type: string;
  response?: { output?: Array<{ type?: string; name?: string; call_id?: string; arguments?: string }> };
  item?: { type?: string; name?: string; call_id?: string; arguments?: string };
  name?: string;
  call_id?: string;
  arguments?: string;
}): Array<{ type?: string; name?: string; call_id?: string; arguments?: string }> {
  if (serverEvent.type === 'response.done' && serverEvent.response?.output) {
    return serverEvent.response.output.filter(
      (item) => item.type === 'function_call' && item.name,
    );
  }

  if (
    serverEvent.type === 'response.output_item.done' &&
    serverEvent.item?.type === 'function_call' &&
    serverEvent.item?.name
  ) {
    return [serverEvent.item];
  }

  if (serverEvent.type === 'response.function_call_arguments.done' && serverEvent.name) {
    return [
      {
        type: 'function_call',
        name: serverEvent.name,
        call_id: serverEvent.call_id,
        arguments: serverEvent.arguments,
      },
    ];
  }

  return [];
}
