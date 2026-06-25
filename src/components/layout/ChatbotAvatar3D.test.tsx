import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatbotAvatar3D } from './ChatbotAvatar3D';

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockGlbPreview() {
      return <div data-testid="mock-glb-preview">3D Avatar</div>;
    },
}));

vi.mock('@/hooks/useSimulatedAmplitude', () => ({
  useSimulatedAmplitude: (enabled: boolean) => (enabled ? 0.6 : 0),
}));

describe('ChatbotAvatar3D', () => {
  it('renders the 3D avatar container', () => {
    render(<ChatbotAvatar3D size={120} speaking />);
    expect(screen.getByTestId('chatbot-avatar-3d')).toBeInTheDocument();
    expect(screen.getByTestId('mock-glb-preview')).toBeInTheDocument();
  });
});
