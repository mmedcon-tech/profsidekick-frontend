import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarPicker from './AvatarPicker';
import type { Avatar } from '@/types/types';

const mockAvatars: Avatar[] = [
  {
    id: 'a1',
    name: 'Dr. Test',
    description: 'Test avatar',
    voice: 'alloy',
    imageUrl: '/x.png',
    accentColor: '#000',
  },
];

describe('AvatarPicker', () => {
  it('renders avatars and calls onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <AvatarPicker
        avatars={mockAvatars}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Dr. Test')).toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('a1');
  });

  it('shows error message', () => {
    render(
      <AvatarPicker
        avatars={[]}
        selectedId={null}
        onSelect={vi.fn()}
        error="Failed to load"
      />,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
