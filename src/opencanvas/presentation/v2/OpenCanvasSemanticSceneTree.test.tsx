import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { OpenCanvasSemanticSceneTree } from './OpenCanvasSemanticSceneTree';

function renderTree(
  nodeCount: number,
  connectorCount = 0
): { onSelectNode: ReturnType<typeof vi.fn>; onSelectConnector: ReturnType<typeof vi.fn> } {
  const nodes = Array.from({ length: nodeCount }, (_, index) =>
    createTestNode(`node-${index}`, {
      content: { label: `Node ${index}` },
      transform: {
        translation: { x: index * 120, y: 0 },
        rotationRadians: 0,
        scale: { x: 1, y: 1 },
      },
    })
  );
  const connectors = Array.from({ length: connectorCount }, (_, index) =>
    createTestConnector(`connector-${index}`, `node-${index}`, `node-${index + 1}`, {
      labels: [
        {
          id: `label-${index}`,
          text: `Path ${index}`,
          pathRatio: 0.5,
          offset: { x: 0, y: 0 },
          metadata: {},
        },
      ],
    })
  );
  const onSelectNode = vi.fn();
  const onSelectConnector = vi.fn();
  render(
    <OpenCanvasSemanticSceneTree
      page={createTestDocument({ nodes, connectors }).pages[0]}
      selection={{ nodeIds: [], primaryNodeId: null }}
      selectedConnectorId={null}
      onSelectNode={onSelectNode}
      onSelectConnector={onSelectConnector}
    />
  );
  return { onSelectNode, onSelectConnector };
}

describe('OpenCanvasSemanticSceneTree', () => {
  it('bounds the accessibility tree and pages every scene object', () => {
    renderTree(205);

    expect(screen.getAllByRole('listitem')).toHaveLength(100);
    expect(screen.getByText('Objects 1–100 of 205')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next objects' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(100);
    expect(screen.getByText('Objects 101–200 of 205')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next objects' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Objects 201–205 of 205')).toBeInTheDocument();
  });

  it('moves spatially between nodes and preserves focus', () => {
    const { onSelectNode } = renderTree(3);
    const first = screen.getByRole('button', { name: 'Select Node 0' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(onSelectNode).toHaveBeenCalledWith('node-1', false);
    expect(screen.getByRole('button', { name: 'Select Node 1' })).toHaveFocus();
  });

  it('traverses connectors sequentially', () => {
    const { onSelectConnector } = renderTree(3, 2);
    const first = screen.getByRole('button', { name: 'Select connector Path 0' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    expect(onSelectConnector).toHaveBeenCalledWith('connector-1');
    expect(screen.getByRole('button', { name: 'Select connector Path 1' })).toHaveFocus();
  });
});
