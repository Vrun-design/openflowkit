import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandBar } from './CommandBar';

vi.mock('./command-bar/useCommandBarCommands', () => ({
  useCommandBarCommands: () => [
    {
      id: 'command-1',
      label: 'Open AI',
      description: 'Open AI tools',
      type: 'action',
      action: vi.fn(),
    },
    {
      id: 'command-2',
      label: 'Open Search',
      description: 'Open search tools',
      type: 'navigation',
      view: 'search',
    },
  ],
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
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search command bar actions' }));
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

  it('wires the search input to the active command option for assistive tech', () => {
    render(<CommandBar {...baseProps} />);

    const input = screen.getByRole('combobox', { name: 'Search command bar actions' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(input.getAttribute('aria-controls')).toBeTruthy();
    expect(input.getAttribute('aria-activedescendant')).toContain('-option-0');
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});
