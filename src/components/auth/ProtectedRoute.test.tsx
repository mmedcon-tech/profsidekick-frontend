import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockPush.mockReset();
    vi.mocked(useAuth).mockReset();
  });

  it('shows spinner while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    } as ReturnType<typeof useAuth>);

    render(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('shows spinner instead of blank screen when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });

  it('renders children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Secret')).toBeInTheDocument();
  });
});
