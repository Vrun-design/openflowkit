import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MindmapNodeProperties } from './MindmapNodeProperties';

const baseHandlers = {
  onChange: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onAddMindmapChild: vi.fn(),
  onAddMindmapSibling: vi.fn(),
};

function createSelectedNode(depth: number) {
  return {
    id: depth === 0 ? 'root-topic' : 'branch-topic',
    type: 'mindmap',
    position: { x: 0, y: 0 },
    data: {
      label: depth === 0 ? 'Root' : 'Branch',
      mindmapDepth: depth,
      ...(depth > 0 ? { mindmapParentId: 'root-topic' } : {}),
    },
  } as const;
}

describe('MindmapNodeProperties', () => {
  it('disables sibling creation for the root topic', () => {
    render(
      <MindmapNodeProperties
        selectedNode={createSelectedNode(0)}
        {...baseHandlers}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Structure' }));
    expect(screen.getByRole('button', { name: 'Add Sibling Topic' }).hasAttribute('disabled')).toBe(true);
  });

  it('calls the sibling handler for branch topics', () => {
    const onAddMindmapSibling = vi.fn();

    render(
      <MindmapNodeProperties
        selectedNode={createSelectedNode(1)}
        {...baseHandlers}
        onAddMindmapSibling={onAddMindmapSibling}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Structure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Sibling Topic' }));

    expect(onAddMindmapSibling).toHaveBeenCalledWith('branch-topic');
  });

  it('updates mindmap appearance color through the shared color picker', () => {
    const onChange = vi.fn();

    render(
      <MindmapNodeProperties
        selectedNode={createSelectedNode(1)}
        {...baseHandlers}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));

    expect(onChange).toHaveBeenCalledWith('branch-topic', expect.objectContaining({ color: 'blue' }));
  });

  it('updates root branch style through the segmented control', () => {
    const onChange = vi.fn();

    render(
      <MindmapNodeProperties
        selectedNode={createSelectedNode(0)}
        {...baseHandlers}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Structure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Straight' }));

    expect(onChange).toHaveBeenCalledWith('root-topic', expect.objectContaining({ mindmapBranchStyle: 'straight' }));
  });

});
