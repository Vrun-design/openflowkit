import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Node } from '@/lib/reactflowCompat';
import { NodeType, type NodeData } from '@/lib/types';
import { BulkNodeProperties } from './BulkNodeProperties';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('./ShapeSelector', () => ({
  ShapeSelector: () => <div>shape-selector</div>,
}));

vi.mock('./ColorPicker', () => ({
  ColorPicker: () => <div>color-picker</div>,
}));

vi.mock('./IconPicker', () => ({
  IconPicker: () => <div>icon-picker</div>,
}));

vi.mock('../ui/Select', () => ({
  Select: () => <div>select</div>,
}));

function createNode(type: string, data: Partial<NodeData> = {}): Node<NodeData> {
  return {
    id: `${type}-${Object.keys(data).length}`,
    type,
    position: { x: 0, y: 0 },
    data: {
      label: 'Node',
      ...data,
    },
  } as Node<NodeData>;
}

describe('BulkNodeProperties', () => {
  it('shows scoped section titles for mixed selections instead of a one-size-fits-all bulk panel', () => {
    render(
      <BulkNodeProperties
        selectedNodes={[
          createNode(NodeType.CUSTOM),
          createNode(NodeType.TEXT),
          createNode(NodeType.BROWSER),
          createNode(NodeType.ARCHITECTURE),
        ]}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText('Bulk Shape (1/4)')).toBeTruthy();
    expect(screen.getByText('Bulk Color (3/4)')).toBeTruthy();
    expect(screen.getByText('Wireframe Variant (1/4)')).toBeTruthy();
    expect(screen.getByText('Architecture Deployment (1/4)')).toBeTruthy();
    expect(screen.getByText('1 Architecture')).toBeTruthy();
    expect(screen.getByText('1 Flow node')).toBeTruthy();
    expect(screen.getByText('1 Text')).toBeTruthy();
    expect(screen.getByText('1 Wireframe')).toBeTruthy();
  });

  it('keeps shared text operations available for every mixed selection', () => {
    render(
      <BulkNodeProperties
        selectedNodes={[createNode(NodeType.TEXT), createNode(NodeType.BROWSER)]}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText('Label Transform')).toBeTruthy();
    expect(screen.getByText('Find & Replace')).toBeTruthy();
    expect(screen.queryByText('Bulk Shape')).toBeNull();
  });

  it('adds scoped family sections for structured node families with safe scalar fields', () => {
    render(
      <BulkNodeProperties
        selectedNodes={[
          createNode(NodeType.JOURNEY),
          createNode(NodeType.CLASS),
          createNode(NodeType.SEQUENCE_PARTICIPANT),
        ]}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText('Journey Step (1/3)')).toBeTruthy();
    expect(screen.getByText('Class Definition (1/3)')).toBeTruthy();
    expect(screen.getByText('Participant (1/3)')).toBeTruthy();
  });
});
