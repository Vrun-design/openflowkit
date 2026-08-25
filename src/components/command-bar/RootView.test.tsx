import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RootView } from './RootView';
import type { CommandItem } from './types';

const commandItems: CommandItem[] = [
  {
    id: 'flowpilot',
    label: 'Open Flowpilot',
    tier: 'core',
    type: 'action',
    icon: <span>AI</span>,
    description: 'Generate and refine diagrams',
    action: vi.fn(),
    keywords: ['assistant', 'generate', 'diagram helper'],
  },
  {
    id: 'dsl',
    label: 'Edit Flow DSL',
    tier: 'advanced',
    type: 'action',
    icon: <span>DSL</span>,
    description: 'Direct editing surface',
    action: vi.fn(),
  },
];

describe('RootView', () => {
  it('renders non-search results without extra product taxonomy copy', () => {
    render(
      <RootView
        commands={commandItems}
        searchQuery=""
        setSearchQuery={vi.fn()}
        selectedIndex={0}
        setSelectedIndex={vi.fn()}
        onClose={vi.fn()}
        setView={vi.fn()}
        inputRef={React.createRef<HTMLInputElement>()}
      />
    );

    expect(screen.getByText('Open Flowpilot')).toBeTruthy();
    expect(screen.getByText('Edit Flow DSL')).toBeTruthy();
  });

  it('finds commands by multi-word intent aliases', () => {
    const setSearchQuery = vi.fn();
    const setSelectedIndex = vi.fn();
    render(
      <RootView
        commands={commandItems}
        searchQuery="diagram helper"
        setSearchQuery={setSearchQuery}
        selectedIndex={0}
        setSelectedIndex={setSelectedIndex}
        onClose={vi.fn()}
        setView={vi.fn()}
        inputRef={React.createRef<HTMLInputElement>()}
      />
    );

    expect(screen.getByText('Open Flowpilot')).toBeTruthy();
    expect(screen.queryByText('Edit Flow DSL')).toBeNull();
  });

  it('executes Enter and closes on Escape while the search input owns focus', () => {
    const action = vi.fn();
    const onClose = vi.fn();
    render(
      <RootView
        commands={[{ ...commandItems[0], action }]}
        searchQuery="assistant"
        setSearchQuery={vi.fn()}
        selectedIndex={0}
        setSelectedIndex={vi.fn()}
        onClose={onClose}
        setView={vi.fn()}
        inputRef={React.createRef<HTMLInputElement>()}
      />
    );

    const search = screen.getByRole('combobox', { name: 'Search command bar actions' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(action).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps the command bar open and reports asynchronous execution failures', async () => {
    const onClose = vi.fn();
    render(
      <RootView
        commands={[{ ...commandItems[0], action: vi.fn(async () => Promise.reject()) }]}
        searchQuery="assistant"
        setSearchQuery={vi.fn()}
        selectedIndex={0}
        setSelectedIndex={vi.fn()}
        onClose={onClose}
        setView={vi.fn()}
        inputRef={React.createRef<HTMLInputElement>()}
      />
    );

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This result could not be added. Nothing changed.'
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
