import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { V2MapToolbar, type V2MapToolbarProps } from './V2MapToolbar';

const props = (over: Partial<V2MapToolbarProps> = {}): V2MapToolbarProps => ({
  depth: 'detailed', onDepth: vi.fn(), onExpandOne: vi.fn(), onCollapseAll: vi.fn(), canExpand: true, onToggleLayer: vi.fn(),
  layers: [{ kind: 'import', label: 'Imports', count: 12, on: true }, { kind: 'call', label: 'Calls', count: 3, on: false }], ...over,
});

// jsdom has no ResizeObserver; the popover places itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

describe('V2MapToolbar', () => {
  it('marks the current depth as pressed and reports a change', () => {
    const p = props();
    render(<V2MapToolbar {...p} />);
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
    expect(p.onDepth).toHaveBeenCalledWith('everything');
  });
  it('expands, collapses and disables expand when nothing can open', () => {
    const p = props();
    const { rerender } = render(<V2MapToolbar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand one level' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(p.onExpandOne).toHaveBeenCalledOnce();
    expect(p.onCollapseAll).toHaveBeenCalledOnce();
    rerender(<V2MapToolbar {...props({ canExpand: false })} />);
    expect(screen.getByRole('button', { name: 'Expand one level' })).toBeDisabled();
  });
  it('opens Connections, toggles a layer with its count, and closes on Escape', () => {
    const p = props();
    render(<V2MapToolbar {...p} />);
    const trigger = screen.getByRole('button', { name: 'Connections' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const calls = screen.getByRole('menuitemcheckbox', { name: /Calls · 3/ });
    expect(calls).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemcheckbox', { name: /Imports · 12/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(calls);
    expect(p.onToggleLayer).toHaveBeenCalledWith('call');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
  it('disables Connections when the model has no links', () => {
    render(<V2MapToolbar {...props({ layers: [] })} />);
    expect(screen.getByRole('button', { name: 'Connections' })).toBeDisabled();
  });
  it('leaves Connections out when no layers are given (a C4 map has one kind)', () => {
    const { layers: _layers, onToggleLayer: _toggle, ...rest } = props();
    render(<V2MapToolbar {...rest} />);
    expect(screen.queryByRole('button', { name: 'Connections' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
  });
});
