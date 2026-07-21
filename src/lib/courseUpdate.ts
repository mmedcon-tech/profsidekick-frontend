import type { CourseDetails } from '@/hooks/useCourses';

const UPDATABLE_FIELDS = [
  'name',
  'code',
  'section',
  'description',
  'department',
  'semester',
  'year',
  'syllabus_details',
  'is_active',
  'is_public',
  'allow_subscriber_sessions',
  'allow_self_enrollment',
  'max_enrollment',
] as const satisfies readonly (keyof CourseDetails)[];

export type CourseUpdatePayload = Partial<
  Pick<CourseDetails, (typeof UPDATABLE_FIELDS)[number]>
> & {
  max_enrollment?: number | null;
};

/** Build a minimal PUT body — only publisher-editable fields, no read-only metadata. */
export function buildCourseUpdatePayload(
  course: Partial<CourseDetails>,
): CourseUpdatePayload {
  const payload: CourseUpdatePayload = {};

  for (const key of UPDATABLE_FIELDS) {
    if (!(key in course)) continue;
    const value = course[key];
    if (value !== undefined) {
      (payload as Record<string, unknown>)[key] = value;
    }
  }

  return payload;
}
