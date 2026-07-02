import type { CourseDetails } from '@/hooks/useCourses';
import type { SubscriberStats } from '@/hooks/useSubscriberStats';

export interface AssistantLearnerContext {
  userName: string;
  assistantName: string;
  courses: CourseDetails[];
  stats: SubscriberStats | null;
}

function courseLabel(course: CourseDetails): string {
  const name = course.name ?? course.code ?? 'Untitled course';
  const code = course.code && course.name ? ` (${course.code})` : '';
  const sessions =
    course.session_count != null ? ` — ${course.session_count} session${course.session_count === 1 ? '' : 's'}` : '';
  return `${name}${code}${sessions}`;
}

export function buildAssistantSystemPrompt(ctx: AssistantLearnerContext): string {
  const courseLines =
    ctx.courses.length > 0
      ? ctx.courses.map((c, i) => `${i + 1}. ${courseLabel(c)}`).join('\n')
      : 'No enrolled courses yet.';

  const stats = ctx.stats;
  const progressBlock = stats
    ? [
        `Enrolled courses: ${stats.coursesEnrolled}`,
        `Completed session runs: ${stats.completedRuns}`,
        `Total learning time: ${Math.round(stats.totalRunMinutes)} minutes`,
        `Overall session progress: ${stats.overallProgressPct}% (sessions with at least one completed run)`,
      ].join('\n')
    : 'Progress data is still loading.';

  return [
    `You are ${ctx.assistantName}, a friendly AI training assistant on ProfSidekick.`,
    `The learner's name is ${ctx.userName}.`,
    'You help subscribers understand their enrolled courses, learning progress, and next steps.',
    'Use only the learner data below. If something is unknown, say so honestly.',
    '',
    '## Enrolled courses',
    courseLines,
    '',
    '## Learner progress',
    progressBlock,
    '',
    'Keep replies concise (2–4 sentences unless the user asks for detail).',
    'Suggest concrete next actions (e.g. continue a course, review a session) when helpful.',
  ].join('\n');
}

export function buildAssistantGreeting(ctx: AssistantLearnerContext): string {
  const first = ctx.userName.split(/\s+/)[0] || ctx.userName;
  const courseCount = ctx.courses.length;
  const progress = ctx.stats?.overallProgressPct;

  if (courseCount === 0) {
    return `Hello ${first}, I'm ${ctx.assistantName}, your training assistant. You're not enrolled in any courses yet — browse the marketplace to get started. How can I help you today?`;
  }

  const topCourses = ctx.courses
    .slice(0, 2)
    .map((c) => c.name ?? c.code ?? 'your course')
    .join(' and ');

  const progressNote =
    progress != null && progress > 0
      ? ` You've completed about ${progress}% of your available sessions so far.`
      : '';

  return `Hello ${first}, I'm ${ctx.assistantName}, your training assistant at ProfSidekick. You have ${courseCount} enrolled course${courseCount === 1 ? '' : 's'}${courseCount <= 2 ? ` including ${topCourses}` : ''}.${progressNote} Ask me about your courses or progress — how can I help you today?`;
}
