import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RefinedPromptEditor from './RefinedPromptEditor';

describe('RefinedPromptEditor', () => {
  it('calls refine and save handlers', async () => {
    const onRefine = vi.fn();
    const onSave = vi.fn();
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RefinedPromptEditor
        refinedPrompt="Test prompt"
        onChange={onChange}
        onRefine={onRefine}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole('button', { name: /refine/i }));
    expect(onRefine).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /save persona/i }));
    expect(onSave).toHaveBeenCalled();
  });
});
