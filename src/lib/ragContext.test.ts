import { describe, expect, it } from 'vitest';
import { formatRagContextMessage, type RagChunk } from './ragContext';
import type { SlideData } from '@/types/types';

const slides: SlideData[] = [
  {
    id: 1,
    slideNumber: 1,
    title: 'Intro',
    content: 'Introduction content here.',
    imagePath: '/a.png',
    thumbnailPath: '/a-thumb.png',
  },
  {
    id: 2,
    slideNumber: 2,
    title: 'Deep Topic',
    content: 'Answer lives on slide two.',
    imagePath: '/b.png',
    thumbnailPath: '/b-thumb.png',
  },
];

describe('formatRagContextMessage', () => {
  it('includes chunks from other slides and marks current slide as supplementary', () => {
    const chunks: RagChunk[] = [
      {
        slide_number: 2,
        chunk_index: 0,
        content: 'Answer lives on slide two.',
        score: 0.91,
        source: 'slide',
      },
    ];

    const message = formatRagContextMessage('What is the deep topic?', chunks, 0, slides);

    expect(message).toMatch(/ALL indexed session slides/i);
    expect(message).toMatch(/slide 2/i);
    expect(message).toMatch(/supplementary context only/i);
    expect(message).toMatch(/Intro/);
    expect(message).toMatch(/prior conversation turns/i);
  });

  it('handles empty retrieval without restricting to current slide', () => {
    const message = formatRagContextMessage('Unknown fact?', [], 0, slides);
    expect(message).toMatch(/no matching chunks/i);
    expect(message).toMatch(/supplementary context only/i);
  });
});
