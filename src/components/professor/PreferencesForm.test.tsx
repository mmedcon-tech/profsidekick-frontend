import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PreferencesForm from './PreferencesForm';
import { DEFAULT_PERSONA_PREFERENCES } from '@/types/types';

describe('PreferencesForm', () => {
  it('updates preferences on change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PreferencesForm
        preferences={DEFAULT_PERSONA_PREFERENCES}
        onChange={onChange}
      />,
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'socratic');
    expect(onChange).toHaveBeenCalled();
  });
});
