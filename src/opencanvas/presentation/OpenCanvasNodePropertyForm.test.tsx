import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../testing/builders/documentBuilder';
import type { DocumentCommand } from '../domain/commands/types';
import { OpenCanvasNodePropertyForm } from './OpenCanvasNodePropertyForm';

describe('OpenCanvas node property form', () => {
  it('emits one typed canonical command for journey properties', () => {
    const node = createTestNode('journey', {
      kind: 'journey', content: { label: 'Checkout', journeyScore: 2 },
    });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const onCommit = vi.fn((_command: DocumentCommand) => true);
    render(<OpenCanvasNodePropertyForm node={node} page={page} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('Actor for Checkout'), { target: { value: 'Buyer' } });
    fireEvent.change(screen.getByLabelText('Score for Checkout'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update properties for Checkout' }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toMatchObject({
      kind: 'set-node', after: { content: { journeyActor: 'Buyer', journeyScore: 4 } },
    });
  });

  it('reports invalid structured family data without emitting a command', () => {
    const node = createTestNode('entity', { kind: 'er_entity', content: { label: 'Order' } });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const onCommit = vi.fn((_command: DocumentCommand) => true);
    render(<OpenCanvasNodePropertyForm node={node} page={page} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('Fields JSON for Order'), { target: { value: '{bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update properties for Order' }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('property values are invalid');
  });
});
