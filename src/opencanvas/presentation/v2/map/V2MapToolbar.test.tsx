import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { V2MapToolbar, type V2MapToolbarProps } from './V2MapToolbar';

const props = (over: Partial<V2MapToolbarProps> = {}): V2MapToolbarProps => ({
  depth: 'detailed', onDepth: vi.fn(), onToggleLayer: vi.fn(),
  layers: [{ kind: 'import', label: 'Imports', count: 12, on: true }, { kind: 'call', label: 'Calls', count: 3, on: false }], ...over,
});

// jsdom has no ResizeObserver; the popover places itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

describe('V2MapToolbar', () => {
  it('marks the current depth as pressed and reports a change', () => {
    const p = props();
    render(<V2MapToolbar {...p} />);
    expect(screen.getByRole('button', { name: 'One level in' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Top level' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'All levels' }));
    expect(p.onDepth).toHaveBeenCalledWith('everything');
  });
  it('while the map is still being drawn: says so, and no level is pressed', () => {
    render(<V2MapToolbar {...props({ depth: null, drawing: true })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Drawing the map…');
    for (const name of ['Top level', 'One level in', 'All levels']) expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
  });
  it('offers Edit as drawing as words, disabled while nothing is drawn', () => {
    const onPin = vi.fn();
    const { rerender } = render(<V2MapToolbar {...props({ onPin, canPin: true })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit as drawing' }));
    expect(onPin).toHaveBeenCalledOnce();
    rerender(<V2MapToolbar {...props({ onPin, canPin: false })} />);
    expect(screen.getByRole('button', { name: 'Edit as drawing' })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: 'Top level' })).toBeInTheDocument();
  });
});
