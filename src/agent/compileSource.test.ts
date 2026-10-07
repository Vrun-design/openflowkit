import { describe, expect, it } from 'vitest';
import { compileSource } from './compileSource';

describe('compileSource', () => {
  it('compiles OpenFlow DSL as it always did', async () => {
    const result = await compileSource('flowchart\nA -> B : go');
    expect(result.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(result.connectors).toHaveLength(1);
  });

  it('converts Mermaid first, so an assistant that answers in Mermaid still draws the diagram', async () => {
    const result = await compileSource('sequenceDiagram\n  Alice->>John: Hello\n  John-xAlice: lost\n  Note right of John: thinking');
    expect(result.meta.family).toBe('sequence');
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    expect(result.connectors).toHaveLength(2);
    expect(result.connectors[1]!.appearance.markerEnd).toBe('cross');
    expect(result.connectors.map((connector) => connector.labels[0]?.text)).toEqual(['Hello', 'lost']);
  });

  it('reads a fenced block and says why a language it knows cannot be converted', async () => {
    const fenced = await compileSource('```mermaid\nflowchart LR\n  A[Start] --> B{Ok?}\n```');
    expect(fenced.nodes.map((node) => node.content.label)).toEqual(['Start', 'Ok?']);
    await expect(compileSource('pie\n  "a" : 1')).rejects.toThrow(/cannot be converted/);
  });
});
