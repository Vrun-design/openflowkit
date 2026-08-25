import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: { openCanvasCustomShortcutsV1: false },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ShortcutsSettings } from './ShortcutsSettings';

describe('ShortcutsSettings with customization disabled', () => {
  it('renders the read-only reference list and no customization affordances', () => {
    render(<ShortcutsSettings />);

    // The shipped reference sections still render.
    expect(screen.getByText('shortcuts.essentials')).toBeTruthy();
    expect(screen.getByText('settingsModal.shortcutsHint')).toBeTruthy();

    // Nothing can rebind, reset, or print.
    expect(screen.queryByText('settingsModal.shortcutsCustomizable')).toBeNull();
    expect(screen.queryByText('settingsModal.shortcutsResetAll')).toBeNull();
    expect(screen.queryByText('settingsModal.shortcutsPrint')).toBeNull();
    expect(screen.queryByLabelText(/settingsModal.shortcutsRecord/)).toBeNull();
  });
});
