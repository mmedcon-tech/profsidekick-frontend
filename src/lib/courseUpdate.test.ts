import { describe, it, expect } from 'vitest';
import { buildCourseUpdatePayload } from './courseUpdate';

describe('buildCourseUpdatePayload', () => {
  it('includes only editable fields', () => {
    const payload = buildCourseUpdatePayload({
      name: 'Economics 101',
      max_enrollment: 30,
      enrollment_count: 12,
      created_at: '2024-01-01',
      course_id: 'abc',
    });

    expect(payload).toEqual({
      name: 'Economics 101',
      max_enrollment: 30,
    });
    expect(payload).not.toHaveProperty('enrollment_count');
    expect(payload).not.toHaveProperty('created_at');
  });

  it('sends null to clear max enrollment', () => {
    const payload = buildCourseUpdatePayload({
      name: 'Economics 101',
      max_enrollment: null,
    });
    expect(payload.max_enrollment).toBeNull();
  });
});
