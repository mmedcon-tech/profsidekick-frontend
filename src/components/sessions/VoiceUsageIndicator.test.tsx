import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceUsageIndicator from './VoiceUsageIndicator';

describe('VoiceUsageIndicator', () => {
  it('renders nothing when no provider is active', () => {
    const { container } = render(<VoiceUsageIndicator provider={null} creditsUsed={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the active provider and running credits used', () => {
    render(<VoiceUsageIndicator provider="elevenlabs" creditsUsed={3.456} />);
    expect(screen.getByText('ElevenLabs')).toBeInTheDocument();
    expect(screen.getByText('3.46 credits used')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('labels the OpenAI provider correctly', () => {
    render(<VoiceUsageIndicator provider="openai" creditsUsed={0} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('shows no fallback banner when fallbackReason is not set', () => {
    render(<VoiceUsageIndicator provider="elevenlabs" creditsUsed={0} />);
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/switched to a lower-cost voice/i)).not.toBeInTheDocument();
  });

  it('shows a platform-unavailable banner distinct from a low-credits banner', () => {
    render(
      <VoiceUsageIndicator provider="openai" creditsUsed={0} fallbackReason="platform_unavailable" />,
    );
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/this is on our end, not yours/i)).toBeInTheDocument();
  });

  it('shows a distinct low-credits banner that never blames the platform', () => {
    render(
      <VoiceUsageIndicator provider="openai" creditsUsed={0} fallbackReason="user_low_credits" />,
    );
    expect(screen.getByText(/switched to a lower-cost voice/i)).toBeInTheDocument();
    expect(screen.queryByText(/temporarily unavailable/i)).not.toBeInTheDocument();
  });

  it('persists the banner alongside the indicator (both remain in the DOM together)', () => {
    render(
      <VoiceUsageIndicator
        provider="openai"
        creditsUsed={1.23}
        fallbackReason="platform_unavailable"
      />,
    );
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('1.23 credits used')).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });
});
