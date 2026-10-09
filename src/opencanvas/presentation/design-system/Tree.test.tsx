import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tree, type TreeNode } from './Tree';

const nodes: TreeNode[] = [
  { id: 'a', label: 'Shop', meta: 'System', children: [{ id: 'a1', label: 'API', meta: 'Go' }, { id: 'a2', label: 'Web' }] },
  { id: 'b', label: 'Customer' },
];

function setup(expanded: string[] = ['a']) {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  const onActivate = vi.fn();
  render(<Tree label="Elements" nodes={nodes} selectedId={null} expandedIds={new Set(expanded)} onSelect={onSelect} onToggle={onToggle} onActivate={onActivate} />);
  return { onSelect, onToggle, onActivate, row: (name: RegExp) => screen.getByRole('treeitem', { name }) };
}

describe('Tree keyboard', () => {
  it('arrows, Home and End move focus without selecting', () => {
    const { row, onSelect } = setup();
    row(/Shop/).focus();
    fireEvent.keyDown(row(/Shop/), { key: 'ArrowDown' });
    expect(row(/API/)).toHaveFocus();
    fireEvent.keyDown(row(/API/), { key: 'End' });
    expect(row(/Customer/)).toHaveFocus();
    fireEvent.keyDown(row(/Customer/), { key: 'Home' });
    expect(row(/Shop/)).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Enter, Space and click select; double-click activates', () => {
    const { row, onSelect, onActivate } = setup();
    fireEvent.keyDown(row(/API/), { key: 'Enter' });
    fireEvent.keyDown(row(/Web/), { key: ' ' });
    fireEvent.click(row(/Customer/));
    expect(onSelect.mock.calls.map(([id]) => id)).toEqual(['a1', 'a2', 'b']);
    fireEvent.doubleClick(row(/Shop/));
    expect(onActivate).toHaveBeenCalledWith('a');
  });

  it('Right expands a closed parent', () => {
    const closed = setup([]);
    fireEvent.keyDown(closed.row(/Shop/), { key: 'ArrowRight' });
    expect(closed.onToggle).toHaveBeenCalledWith('a');
  });

  it('Right on an open parent enters it, and on a leaf does nothing', () => {
    const { row, onToggle } = setup();
    fireEvent.keyDown(row(/Shop/), { key: 'ArrowRight' });
    expect(row(/API/)).toHaveFocus();
    fireEvent.keyDown(row(/API/), { key: 'ArrowRight' });
    expect(row(/API/)).toHaveFocus();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('Left on a child moves focus to its parent; on an open parent it collapses', () => {
    const { row, onToggle, onSelect } = setup();
    fireEvent.keyDown(row(/API/), { key: 'ArrowLeft' });
    expect(row(/Shop/)).toHaveFocus();
    fireEvent.keyDown(row(/Shop/), { key: 'ArrowLeft' });
    expect(onToggle).toHaveBeenCalledWith('a');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keeps one tab stop, on the row focus last visited', () => {
    const { row } = setup();
    expect(row(/Shop/)).toHaveAttribute('tabindex', '0');
    fireEvent.focus(row(/Web/));
    expect(row(/Web/)).toHaveAttribute('tabindex', '0');
    expect(row(/Shop/)).toHaveAttribute('tabindex', '-1');
  });

  it('shows the meta text on the row', () => {
    setup();
    expect(screen.getByText('Go')).toBeInTheDocument();
  });
});
