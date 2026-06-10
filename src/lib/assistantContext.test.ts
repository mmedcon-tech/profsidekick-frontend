import { describe, expect, it } from 'vitest';
import {
  buildAssistantGreeting,
  buildAssistantSystemPrompt,
} from '@/lib/assistantContext';

describe('assistantContext', () => {
  it('buildAssistantGreeting mentions courses and progress', () => {
    const greeting = buildAssistantGreeting({
      userName: 'Seidu Sulemana',
      assistantName: 'Salama',
      courses: [
        { course_id: '1', name: 'Leadership 101', created_at: '', updated_at: '' },
      ],
      stats: {
        coursesEnrolled: 1,
        completedRuns: 2,
        totalRunMinutes: 45,
        overallProgressPct: 50,
      },
    });
    expect(greeting).toContain('Salama');
    expect(greeting).toContain('Leadership 101');
    expect(greeting).toContain('50%');
  });

  it('buildAssistantSystemPrompt lists enrolled courses', () => {
    const prompt = buildAssistantSystemPrompt({
      userName: 'Alex',
      assistantName: 'Sultan',
      courses: [
        {
          course_id: 'c1',
          name: 'AI Governance',
          code: 'AI101',
          session_count: 3,
          created_at: '',
          updated_at: '',
        },
      ],
      stats: null,
    });
    expect(prompt).toContain('AI Governance');
    expect(prompt).toContain('3 sessions');
  });
});
