import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoiceSettingsPanel from './VoiceSettingsPanel';
import { useVoicePreferences } from '@/hooks/useVoicePreferences';
import { useVoiceCatalog } from '@/hooks/useVoiceCatalog';
import { useVoiceProviderAvailability } from '@/hooks/useVoiceProviderAvailability';

vi.mock('@/hooks/useVoicePreferences');
vi.mock('@/hooks/useVoiceCatalog');
vi.mock('@/hooks/useVoiceProviderAvailability');

const mockUseVoicePreferences = vi.mocked(useVoicePreferences);
const mockUseVoiceCatalog = vi.mocked(useVoiceCatalog);
const mockUseVoiceProviderAvailability = vi.mocked(useVoiceProviderAvailability);

const saveOverride = vi.fn().mockResolvedValue({ success: true });
const clearOverride = vi.fn().mockResolvedValue({ success: true });

function mockPreferences(overrides: Partial<ReturnType<typeof useVoicePreferences>> = {}) {
  mockUseVoicePreferences.mockReturnValue({
    data: {
      preference: null,
      resolved: { provider: 'elevenlabs', voice_id: 'rachel', dialect: 'en-US', source: 'publisher' },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    saveOverride,
    clearOverride,
    isSaving: false,
    ...overrides,
  });
}

function mockCatalog() {
  mockUseVoiceCatalog.mockReturnValue({
    catalog: {
      provider: 'openai',
      voices: [
        { id: 'alloy', name: 'Alloy', dialects: ['en'] },
        { id: 'nova', name: 'Nova', dialects: ['en'] },
      ],
      cost_per_1k_characters_usd: '0.015000',
    },
    isLoading: false,
    error: null,
  });
}

function mockAvailability(
  overrides: Partial<ReturnType<typeof useVoiceProviderAvailability>> = {},
) {
  mockUseVoiceProviderAvailability.mockReturnValue({
    availability: {
      openai: { available: true, reason: null },
      elevenlabs: { available: true, reason: null },
    },
    isLoading: false,
    error: null,
    ...overrides,
  });
}

describe('VoiceSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreferences();
    mockCatalog();
    mockAvailability();
  });

  it('shows a loading state while preferences are being fetched', () => {
    mockPreferences({ isLoading: true, data: null });
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);
    expect(screen.getByText(/loading your voice settings/i)).toBeInTheDocument();
  });

  it('shows a fallback message on error but still lets the user proceed', async () => {
    mockPreferences({ error: 'network down', data: null });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={onDone} />);

    expect(screen.getByText(/instructor's default voice will be used/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it('does not show "Reset to instructor default" when there is no saved override', () => {
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /reset to instructor default/i }),
    ).not.toBeInTheDocument();
  });

  it('shows "Reset to instructor default" and clears the override when clicked', async () => {
    mockPreferences({
      data: {
        preference: {
          id: 'p1',
          provider: 'openai',
          voice_id: 'nova',
          dialect: 'en-US',
          is_valid: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        resolved: { provider: 'openai', voice_id: 'nova', dialect: 'en-US', source: 'subscriber' },
      },
    });
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: /reset to instructor default/i }));
    expect(clearOverride).toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('skipping calls onDone without saving or clearing anything', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onDone).toHaveBeenCalled();
    expect(saveOverride).not.toHaveBeenCalled();
    expect(clearOverride).not.toHaveBeenCalled();
  });

  it('keeping the instructor default and confirming does not call saveOverride', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={onDone} />);

    await user.click(screen.getByRole('button', { name: 'Start Session' }));
    expect(saveOverride).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it('customizing and saving calls saveOverride with the chosen provider/voice/dialect', async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={onDone} />);

    await user.click(screen.getByText(/customize my voice/i));
    await user.selectOptions(screen.getByLabelText(/provider/i), 'openai');

    await waitFor(() => expect(screen.getByLabelText(/^voice$/i)).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText(/^voice$/i), 'nova');

    await user.click(screen.getByRole('button', { name: 'Start Session' }));

    await waitFor(() => expect(saveOverride).toHaveBeenCalledWith('openai', 'nova', undefined));
    expect(onDone).toHaveBeenCalled();
  });

  it('shows an estimated cost per minute once a catalog is loaded', async () => {
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);

    await user.click(screen.getByText(/customize my voice/i));
    expect(await screen.findByText(/estimated cost/i)).toBeInTheDocument();
  });

  it('disables the ElevenLabs option and labels it unavailable when the availability check fails', async () => {
    mockAvailability({
      availability: {
        openai: { available: true, reason: null },
        elevenlabs: { available: false, reason: 'platform_quota_exceeded' },
      },
    });
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);

    await user.click(screen.getByText(/customize my voice/i));

    const elevenLabsOption = screen.getByRole('option', {
      name: /elevenlabs voices.*currently unavailable/i,
    }) as HTMLOptionElement;
    expect(elevenLabsOption.disabled).toBe(true);
  });

  it('auto-selects OpenAI when the seeded provider (instructor default) is unavailable', async () => {
    mockPreferences({
      data: {
        preference: null,
        resolved: {
          provider: 'elevenlabs',
          voice_id: 'rachel',
          dialect: 'en-US',
          source: 'publisher',
        },
      },
    });
    mockAvailability({
      availability: {
        openai: { available: true, reason: null },
        elevenlabs: { available: false, reason: 'platform_quota_exceeded' },
      },
    });
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);

    await user.click(screen.getByText(/customize my voice/i));

    await waitFor(() =>
      expect(screen.getByLabelText(/provider/i)).toHaveValue('openai'),
    );
  });

  it('flags the instructor default itself as unavailable so the subscriber is not surprised', () => {
    mockAvailability({
      availability: {
        openai: { available: true, reason: null },
        elevenlabs: { available: false, reason: 'platform_quota_exceeded' },
      },
    });
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);

    expect(screen.getByText(/currently unavailable — service issue on our end/i)).toBeInTheDocument();
  });

  it('does not disable ElevenLabs when the availability check has not resolved yet', async () => {
    mockAvailability({ availability: null, isLoading: true });
    const user = userEvent.setup();
    render(<VoiceSettingsPanel open onDone={vi.fn()} />);

    await user.click(screen.getByText(/customize my voice/i));
    const elevenLabsOption = screen.getByRole('option', {
      name: 'ElevenLabs voices',
    }) as HTMLOptionElement;
    expect(elevenLabsOption.disabled).toBe(false);
  });
});
