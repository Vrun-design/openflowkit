import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandBar } from './CommandBar';

vi.mock('./command-bar/useCommandBarCommands', () => ({
  useCommandBarCommands: () => [],
}));

describe('CommandBar', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    nodes: [],
    edges: [],
  };

  it('renders with dialog semantics and focuses the search input', () => {
    render(<CommandBar {...baseProps} />);

    expect(screen.getByRole('dialog', { name: 'Command bar' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search command bar actions' }));
  });

  it('closes on Escape and restores focus to the previous control', async () => {
    function Harness(): React.ReactElement {
      const [isOpen, setIsOpen] = React.useState(false);

      return (
        <div>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open command bar
          </button>
          <CommandBar {...baseProps} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open command bar' });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.keyDown(window, { key: 'Escape' });

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open command bar' }));
    });
  });
});
