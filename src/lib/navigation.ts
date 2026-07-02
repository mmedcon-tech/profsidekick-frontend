/**
 * Role-aware navigation map for the AI assistant.
 *
 * Maps user-friendly intents ("courses", "reports", "settings", …) to the real
 * routes that exist for each role, so the assistant only ever navigates to areas
 * the current user can actually access — and lands on the correct page instead
 * of always falling back to the dashboard.
 */

import { toFrontendRole, type FrontendRole } from '@/lib/roleMapping';

export interface NavDestination {
  /** Stable key (also used as the quick-action id). */
  key: string;
  label: { en: string; ar: string };
  route: string;
  /** Lowercase match terms (English + Arabic). First destination to match wins. */
  keywords: string[];
  /** Show as a quick-action chip in the assistant. */
  quickAction?: boolean;
}

export type NavigationMap = NavDestination[];

// Ordered most-specific first so e.g. "marketplace" isn't swallowed by "course".
export const NAVIGATION_MAP: Record<FrontendRole, NavigationMap> = {
  subscriber: [
    {
      key: 'courses',
      label: { en: 'My Courses', ar: 'دوراتي' },
      route: '/subscriber/courses',
      keywords: ['course', 'courses', 'class', 'classes', 'lesson', 'lessons', 'assignment', 'assignments', 'homework', 'دورة', 'دورات', 'الدورات', 'تدريب', 'الواجبات'],
      quickAction: true,
    },
    {
      key: 'marketplace',
      label: { en: 'Marketplace', ar: 'المتجر' },
      route: '/subscriber/marketplace',
      keywords: ['marketplace', 'market', 'browse', 'explore', 'discover', 'avatars', 'tutors', 'المتجر', 'السوق', 'استكشاف'],
      quickAction: true,
    },
    {
      key: 'analytics',
      label: { en: 'My Progress', ar: 'تقدمي' },
      route: '/subscriber/analytics',
      keywords: ['analytics', 'progress', 'report', 'reports', 'stats', 'statistics', 'performance', 'grades', 'التحليلات', 'تقدم', 'تقارير', 'الأداء'],
      quickAction: true,
    },
    {
      key: 'billing',
      label: { en: 'Billing & Credits', ar: 'الفواتير والرصيد' },
      route: '/subscriber/billing',
      keywords: ['billing', 'credit', 'credits', 'payment', 'payments', 'invoice', 'subscription', 'plan', 'الفواتير', 'الرصيد', 'الاشتراك', 'الدفع'],
    },
    {
      key: 'profile',
      label: { en: 'Profile & Settings', ar: 'الملف والإعدادات' },
      route: '/subscriber/profile',
      keywords: ['profile', 'setting', 'settings', 'account', 'preferences', 'الملف', 'الإعدادات', 'الحساب'],
    },
    {
      key: 'dashboard',
      label: { en: 'Dashboard', ar: 'لوحة التحكم' },
      route: '/subscriber/dashboard',
      keywords: ['dashboard', 'home', 'overview', 'start', 'الرئيسية', 'لوحة', 'الصفحة الرئيسية'],
      quickAction: true,
    },
  ],
  publisher: [
    {
      key: 'avatars',
      label: { en: 'Avatars', ar: 'المساعدون' },
      route: '/publisher/avatars',
      keywords: ['avatar', 'avatars', 'character', 'characters', 'persona', 'المساعد', 'المساعدون', 'الأفاتار'],
      quickAction: true,
    },
    {
      key: 'courses',
      label: { en: 'Courses', ar: 'الدورات' },
      route: '/publisher/courses',
      keywords: ['course', 'courses', 'class', 'classes', 'الدورات', 'دورة'],
      quickAction: true,
    },
    {
      key: 'programs',
      label: { en: 'Programs', ar: 'البرامج' },
      route: '/publisher/programs',
      keywords: ['program', 'programs', 'curriculum', 'البرامج', 'برنامج'],
    },
    {
      key: 'sessions',
      label: { en: 'Sessions', ar: 'الجلسات' },
      route: '/publisher/sessions',
      keywords: ['session', 'sessions', 'live', 'الجلسات', 'جلسة'],
      quickAction: true,
    },
    {
      key: 'analytics',
      label: { en: 'Analytics', ar: 'التحليلات' },
      route: '/publisher/analytics',
      keywords: ['analytics', 'report', 'reports', 'stats', 'statistics', 'insights', 'performance', 'التحليلات', 'تقارير', 'الأداء'],
      quickAction: true,
    },
    {
      key: 'dashboard',
      label: { en: 'Dashboard', ar: 'لوحة التحكم' },
      route: '/publisher/dashboard',
      keywords: ['dashboard', 'home', 'overview', 'الرئيسية', 'لوحة'],
    },
  ],
  admin: [
    {
      key: 'users',
      label: { en: 'Users', ar: 'المستخدمون' },
      route: '/admin/users',
      keywords: ['user', 'users', 'people', 'accounts', 'members', 'المستخدمون', 'المستخدمين'],
      quickAction: true,
    },
    {
      key: 'templates',
      label: { en: 'Templates', ar: 'القوالب' },
      route: '/admin/templates',
      keywords: ['template', 'templates', 'القوالب', 'قالب'],
      quickAction: true,
    },
    {
      key: 'avatars',
      label: { en: 'Avatars', ar: 'المساعدون' },
      route: '/admin/avatars',
      keywords: ['avatar', 'avatars', 'المساعدون', 'الأفاتار'],
    },
    {
      key: 'models',
      label: { en: '3D Models', ar: 'النماذج' },
      route: '/admin/models',
      keywords: ['model', 'models', '3d', 'glb', 'النماذج', 'نموذج'],
    },
    {
      key: 'marketplace',
      label: { en: 'Marketplace', ar: 'المتجر' },
      route: '/admin/marketplace',
      keywords: ['marketplace', 'market', 'المتجر', 'السوق'],
    },
    {
      key: 'analytics',
      label: { en: 'Analytics', ar: 'التحليلات' },
      route: '/admin/analytics',
      keywords: ['analytics', 'report', 'reports', 'stats', 'insights', 'التحليلات', 'تقارير'],
      quickAction: true,
    },
    {
      key: 'dashboard',
      label: { en: 'Dashboard', ar: 'لوحة التحكم' },
      route: '/admin/dashboard',
      keywords: ['dashboard', 'home', 'overview', 'الرئيسية', 'لوحة'],
    },
  ],
};

/** Normalise any backend/frontend role string to a known FrontendRole. */
export function normalizeRole(role: string | null | undefined): FrontendRole {
  const mapped = toFrontendRole(role);
  if (mapped === 'publisher' || mapped === 'admin' || mapped === 'subscriber') {
    return mapped;
  }
  return 'subscriber';
}

export function getNavigationMap(role: string | null | undefined): NavigationMap {
  return NAVIGATION_MAP[normalizeRole(role)];
}

/** Destinations surfaced as quick-action chips for a role. */
export function getQuickNavActions(role: string | null | undefined): NavDestination[] {
  return getNavigationMap(role).filter((d) => d.quickAction);
}

/**
 * Resolve a free-text navigation request to a destination for the user's role.
 * Returns null when nothing matches (the caller should then answer normally
 * rather than navigating somewhere wrong).
 */
export function resolveNavDestination(
  role: string | null | undefined,
  query: string,
): NavDestination | null {
  const q = query.toLowerCase();
  const map = getNavigationMap(role);

  // Exact-ish keyword containment, most-specific destination first.
  for (const dest of map) {
    if (dest.keywords.some((kw) => q.includes(kw))) return dest;
  }
  return null;
}
