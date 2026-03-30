import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowTabs } from './FlowTabs';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('FlowTabs', () => {
  function createProps() {
    return {
      pages: [
        { id: 'page-1', name: 'Page One', nodes: [], edges: [], history: { past: [], future: [] } },
        { id: 'page-2', name: 'Page Two', nodes: [], edges: [], history: { past: [], future: [] } },
        { id: 'page-3', name: 'Page Three', nodes: [], edges: [], history: { past: [], future: [] } },
      ],
      activePageId: 'page-1',
      onSwitchPage: vi.fn(),
      onAddPage: vi.fn(),
      onClosePage: vi.fn(),
      onRenamePage: vi.fn(),
      onReorderPage: vi.fn(),
    };
  }

  it('reorders pages when a tab is dropped onto another tab', () => {
    const props = createProps();
    render(<FlowTabs {...props} />);

    const tabs = screen.getAllByTestId('flow-page-tab');
    fireEvent.dragStart(tabs[0]);
    fireEvent.dragOver(tabs[2]);
    fireEvent.drop(tabs[2]);

    expect(props.onReorderPage).toHaveBeenCalledWith('page-1', 'page-3');
  });

  it('does not reorder when a tab is dropped onto itself', () => {
    const props = createProps();
    render(<FlowTabs {...props} />);

    const tabs = screen.getAllByTestId('flow-page-tab');
    fireEvent.dragStart(tabs[1]);
    fireEvent.dragOver(tabs[1]);
    fireEvent.drop(tabs[1]);

    expect(props.onReorderPage).not.toHaveBeenCalled();
  });
});
