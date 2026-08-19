import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../testing/builders/documentBuilder';
import { OpenCanvasNodeSizingForm } from './OpenCanvasNodeSizingForm';

describe('OpenCanvas node sizing form', () => {
  it('commits a typed responsive policy and reports invalid bounds', () => {
    const node = createTestNode('node', { content: { label: 'Node' } });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    const onCommit = vi.fn(() => true);
    render(<OpenCanvasNodeSizingForm node={node} page={page} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('Size mode for Node'), { target: { value: 'responsive' } });
    fireEvent.change(screen.getByLabelText('Overflow for Node'), { target: { value: 'wrap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update sizing for Node' }));
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'set-node' }));

    fireEvent.change(screen.getByLabelText('Minimum width for Node'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Maximum width for Node'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update sizing for Node' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/maxSize/);
  });
});
