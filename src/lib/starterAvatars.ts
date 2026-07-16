/**
 * Platform starter avatars.
 *
 * These are always visible in the publisher dashboard, avatar list,
 * and subscriber marketplace regardless of what is in the database.
 *
 * ProfSidekick represents the existing course/session workflow and
 * routes directly into it.  Law and Medical are coming-soon placeholders
 * backed by the templates seeded by scripts/seed_platform.py.
 */

export interface StarterAvatar {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isAvailable: boolean;
  /** Where publishers are taken when they click this avatar */
  publisherHref: string;
  /** Where subscribers are taken when they click this avatar */
  subscriberHref: string;
  /** Where admins are taken when they click this avatar */
  adminHref: string;
  accentColor: 'blue' | 'purple' | 'emerald';
  badge: string;
}

export const STARTER_AVATARS: StarterAvatar[] = [
  {
    id: '__profsidekick__',
    name: 'ProfSidekick',
    tagline: 'Default Educational Assistant',
    description:
      "The platform's flagship avatar. Covers the full teaching workflow: " +
      'courses, sessions, oral examinations, rubrics, grading, AI voice, and slides.',
    isAvailable: true,
    publisherHref: '/dashboard',
    subscriberHref: '/dashboard',
    adminHref: '/admin/avatars',
    accentColor: 'blue',
    badge: 'Flagship',
  },
  {
    id: '__law__',
    name: 'Law Mentor',
    tagline: 'Legal Education Avatar',
    description:
      'Socratic dialogue, case analysis, and statutory interpretation ' +
      'for law students and professionals.',
    isAvailable: false,
    publisherHref: '#',
    subscriberHref: '#',
    adminHref: '#',
    accentColor: 'purple',
    badge: 'Coming Soon',
  },
  {
    id: '__medical__',
    name: 'Medical Mentor',
    tagline: 'Clinical Education Avatar',
    description:
      'Clinical reasoning, differential diagnosis, and simulated patient ' +
      'encounters for medical trainees.',
    isAvailable: false,
    publisherHref: '#',
    subscriberHref: '#',
    adminHref: '#',
    accentColor: 'emerald',
    badge: 'Coming Soon',
  },
];

// Tailwind classes per accent colour
export const ACCENT = {
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    border: 'hover:border-blue-400',
    btn: 'bg-blue-600 hover:bg-blue-700',
    gradient: 'from-blue-500 to-indigo-600',
  },
  purple: {
    icon: 'bg-purple-100 text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    border: 'hover:border-purple-400',
    btn: 'bg-purple-600 hover:bg-purple-700',
    gradient: 'from-purple-500 to-violet-600',
  },
  emerald: {
    icon: 'bg-primary/10 text-primary',
    badge: 'bg-primary/10 text-primary/90',
    border: 'hover:border-primary/40',
    btn: 'bg-primary hover:bg-primary/90',
    gradient: 'from-primary/50 to-teal-600',
  },
} as const;
