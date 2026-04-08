import { describe, expect, it } from 'vitest';
import { buildMermaidDiagnosticsSnapshot } from './diagnosticsSnapshot';

describe('diagnosticsSnapshot', () => {
  it('builds a partial-editability snapshot with derived status fields', () => {
    const snapshot = buildMermaidDiagnosticsSnapshot({
      source: 'paste',
      diagramType: 'flowchart',
      importState: 'editable_partial',
      originalSource: 'flowchart TD\nA-->B',
      diagnostics: [{ message: 'warning' }],
      nodeCount: 3,
      edgeCount: 2,
    });

    expect(snapshot.statusLabel).toBe('Ready with warnings');
    expect(snapshot.statusDetail).toBe('3 nodes, 2 edges, partial editability (edge syntax edge cases)');
    expect(snapshot.originalSource).toContain('flowchart TD');
    expect(snapshot.error).toBeUndefined();
  });

  it('adds fallback guidance to blocked snapshots', () => {
    const snapshot = buildMermaidDiagnosticsSnapshot({
      source: 'code',
      importState: 'unsupported_family',
      diagnostics: [],
      error: 'Mermaid "gitGraph" is not supported yet in editable mode.',
    });

    expect(snapshot.error).toContain('not editable yet');
    expect(snapshot.statusLabel).toBe('Unsupported Mermaid family');
  });
});
