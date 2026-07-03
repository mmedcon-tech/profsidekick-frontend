import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceUsageSummaryModal from './VoiceUsageSummaryModal';

describe('VoiceUsageSummaryModal', () => {
  it('shows the total and per-provider breakdown', () => {
    render(
      <VoiceUsageSummaryModal
        open
        usageByProvider={{
          elevenlabs: { characters: 500, credits: 2.5 },
          openai: { characters: 200, credits: 0.3 },
        }}
        balance={97.2}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('2.80')).toBeInTheDocument(); // total
    expect(screen.getByText('ElevenLabs')).toBeInTheDocument();
    expect(screen.getByText('2.50 credits (500 chars)')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('0.30 credits (200 chars)')).toBeInTheDocument();
    expect(screen.getByText('97.20 credits')).toBeInTheDocument();
  });

  it('calls onContinue when Done is clicked', async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <VoiceUsageSummaryModal
        open
        usageByProvider={{ openai: { characters: 100, credits: 0.1 } }}
        balance={null}
        onContinue={onContinue}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('renders zero total with no usage', () => {
    render(
      <VoiceUsageSummaryModal open usageByProvider={{}} balance={null} onContinue={vi.fn()} />,
    );
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });
});
