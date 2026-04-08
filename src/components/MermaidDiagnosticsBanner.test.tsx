import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MermaidDiagnosticsBanner } from './MermaidDiagnosticsBanner';

describe('MermaidDiagnosticsBanner', () => {
  it('renders status and detail for warning snapshots', () => {
    render(
      <MermaidDiagnosticsBanner
        snapshot={{
          source: 'code',
          diagramType: 'flowchart',
          importState: 'editable_partial',
          statusLabel: 'Ready with warnings',
          statusDetail: '2 nodes, 1 edges, partial editability',
          originalSource: 'flowchart TD\nA-->B',
          diagnostics: [{ message: 'warning' }],
          updatedAt: 1,
        }}
      />
    );

    expect(screen.getByText('Ready with warnings')).toBeTruthy();
    expect(screen.getByText('2 nodes, 1 edges, partial editability')).toBeTruthy();
    expect(screen.getByText(/Original Mermaid source is preserved/i)).toBeTruthy();
  });

  it('renders and triggers the recovery action when provided', () => {
    const onAction = vi.fn();

    render(
      <MermaidDiagnosticsBanner
        snapshot={{
          source: 'code',
          diagramType: 'flowchart',
          importState: 'unsupported_construct',
          statusLabel: 'Unsupported Mermaid construct',
          statusDetail: 'Original source is preserved for recovery.',
          originalSource: 'flowchart TD\nA@{ shape: rect }-->B',
          diagnostics: [{ message: 'unsupported' }],
          updatedAt: 1,
        }}
        actionLabel="Open Mermaid code"
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Mermaid code' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
