import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RefinedPromptEditor from './RefinedPromptEditor';

describe('RefinedPromptEditor', () => {
  it('calls refine with optional instructions field', async () => {
    const onRefine = vi.fn();
    const user = userEvent.setup();

    render(
      <RefinedPromptEditor
        additionalInstructions=""
        onAdditionalInstructionsChange={vi.fn()}
        refinedPrompt=""
        onRefinedPromptChange={vi.fn()}
        onRefine={onRefine}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /refine/i }));
    expect(onRefine).toHaveBeenCalled();
  });

  it('shows save when refined prompt exists', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <RefinedPromptEditor
        additionalInstructions="Be concise"
        onAdditionalInstructionsChange={vi.fn()}
        refinedPrompt="Test prompt"
        onRefinedPromptChange={vi.fn()}
        onRefine={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save refined prompt/i }));
    expect(onSave).toHaveBeenCalled();
  });
});
