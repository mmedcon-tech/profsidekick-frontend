import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import TranscriptPanel, { type TranscriptMessage } from './TranscriptPanel';

afterEach(() => {
  cleanup();
});

describe('TranscriptPanel', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(
      <TranscriptPanel messages={[]} isVisible={false} onClose={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an empty-state message when there are no messages yet', () => {
    render(<TranscriptPanel messages={[]} isVisible onClose={vi.fn()} onClear={vi.fn()} />);
    expect(
      screen.getByText(/transcript will appear here once the session starts/i),
    ).toBeInTheDocument();
  });

  it('renders user and assistant messages in order with distinct speaker badges', () => {
    vi.useFakeTimers();
    const messages: TranscriptMessage[] = [
      { id: '1', role: 'user', text: 'Hello there' },
      { id: '2', role: 'assistant', text: 'Hi, how can I help?' },
    ];
    render(<TranscriptPanel messages={messages} isVisible onClose={vi.fn()} onClear={vi.fn()} />);

    // Let the typing animation finish revealing both messages.
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const bubbles = screen.getAllByText(/Hello there|Hi, how can I help\?/);
    expect(bubbles).toHaveLength(2);
    expect(screen.getByText('ME')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<TranscriptPanel messages={[]} isVisible onClose={onClose} onClear={vi.fn()} />);
    screen.getByRole('button', { name: /close transcript/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when the clear button is clicked', () => {
    const onClear = vi.fn();
    render(<TranscriptPanel messages={[]} isVisible onClose={vi.fn()} onClear={onClear} />);
    screen.getByRole('button', { name: /clear/i }).click();
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('TranscriptPanel typing animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reveals a new message a few characters at a time instead of all at once', () => {
    const messages: TranscriptMessage[] = [
      { id: '1', role: 'assistant', text: 'Hello world' },
    ];
    render(<TranscriptPanel messages={messages} isVisible onClose={vi.fn()} onClear={vi.fn()} />);

    // Immediately after mount, the full text should not yet be visible.
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not re-type a message that already finished animating on a later render', () => {
    const initial: TranscriptMessage[] = [{ id: '1', role: 'assistant', text: 'Hello world' }];
    const { rerender } = render(
      <TranscriptPanel messages={initial} isVisible onClose={vi.fn()} onClear={vi.fn()} />,
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('Hello world')).toBeInTheDocument();

    // A second message arrives; the component re-renders with both messages.
    const updated: TranscriptMessage[] = [
      ...initial,
      { id: '2', role: 'user', text: 'Thanks!' },
    ];
    rerender(<TranscriptPanel messages={updated} isVisible onClose={vi.fn()} onClear={vi.fn()} />);

    // The already-committed message stays fully rendered immediately — it must
    // not reset back to a partial reveal just because the list changed.
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
