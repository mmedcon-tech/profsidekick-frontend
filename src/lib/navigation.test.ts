import { describe, expect, it } from 'vitest';
import {
  getNavigationMap,
  getQuickNavActions,
  normalizeRole,
  resolveNavDestination,
} from './navigation';

describe('normalizeRole', () => {
  it('maps backend roles to frontend roles', () => {
    expect(normalizeRole('professor')).toBe('publisher');
    expect(normalizeRole('student')).toBe('subscriber');
    expect(normalizeRole('admin')).toBe('admin');
  });

  it('passes through frontend roles', () => {
    expect(normalizeRole('publisher')).toBe('publisher');
    expect(normalizeRole('subscriber')).toBe('subscriber');
  });

  it('defaults unknown/empty roles to subscriber', () => {
    expect(normalizeRole(null)).toBe('subscriber');
    expect(normalizeRole(undefined)).toBe('subscriber');
    expect(normalizeRole('mystery')).toBe('subscriber');
  });
});

describe('resolveNavDestination', () => {
  it('routes "go to courses" to the role-specific courses page', () => {
    expect(resolveNavDestination('subscriber', 'go to courses')?.route).toBe('/subscriber/courses');
    expect(resolveNavDestination('publisher', 'open my courses')?.route).toBe('/publisher/courses');
  });

  it('does NOT collapse everything to the dashboard', () => {
    expect(resolveNavDestination('subscriber', 'show my progress')?.route).toBe(
      '/subscriber/analytics',
    );
    expect(resolveNavDestination('subscriber', 'open the marketplace')?.route).toBe(
      '/subscriber/marketplace',
    );
    expect(resolveNavDestination('subscriber', 'billing and credits')?.route).toBe(
      '/subscriber/billing',
    );
  });

  it('maps friendly intents (reports, assignments, settings)', () => {
    expect(resolveNavDestination('publisher', 'reports')?.route).toBe('/publisher/analytics');
    expect(resolveNavDestination('subscriber', 'assignments')?.route).toBe('/subscriber/courses');
    expect(resolveNavDestination('subscriber', 'account settings')?.route).toBe(
      '/subscriber/profile',
    );
  });

  it('is role-aware — publisher-only areas are not resolved for subscribers', () => {
    expect(resolveNavDestination('publisher', 'programs')?.route).toBe('/publisher/programs');
    expect(resolveNavDestination('subscriber', 'programs')).toBeNull();
    expect(resolveNavDestination('admin', 'users')?.route).toBe('/admin/users');
    expect(resolveNavDestination('subscriber', 'users')).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(resolveNavDestination('subscriber', 'what is the weather')).toBeNull();
  });
});

describe('getQuickNavActions', () => {
  it('only returns destinations from the role map', () => {
    const subActions = getQuickNavActions('subscriber');
    const subRoutes = new Set(getNavigationMap('subscriber').map((d) => d.route));
    expect(subActions.length).toBeGreaterThan(0);
    expect(subActions.every((a) => subRoutes.has(a.route))).toBe(true);
  });
});
