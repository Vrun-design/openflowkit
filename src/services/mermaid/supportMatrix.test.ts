import { describe, expect, it } from 'vitest';
import { DIAGRAM_TYPES } from '@/lib/types';
import {
  getMermaidFamilySupportMatrixEntry,
  listMermaidFamilySupportMatrix,
} from './supportMatrix';

describe('mermaid support matrix', () => {
  it('covers every supported editable Mermaid family exactly once', () => {
    const entries = listMermaidFamilySupportMatrix();

    expect(entries).toHaveLength(DIAGRAM_TYPES.length);
    expect(entries.map((entry) => entry.family)).toEqual(
      expect.arrayContaining([...DIAGRAM_TYPES])
    );
  });

  it('orders families by execution priority', () => {
    const entries = listMermaidFamilySupportMatrix();

    expect(entries[0].family).toBe('flowchart');
    expect(entries[1].family).toBe('architecture');
    expect(entries[2].family).toBe('sequence');
  });

  it('exposes partial-support guidance for richer technical families', () => {
    expect(getMermaidFamilySupportMatrixEntry('classDiagram').partialConstructs).toEqual(
      expect.arrayContaining(['generics', 'visibility richness'])
    );
    expect(getMermaidFamilySupportMatrixEntry('erDiagram').partialConstructs).toEqual(
      expect.arrayContaining(['constraint richness'])
    );
    expect(getMermaidFamilySupportMatrixEntry('sequence').partialConstructs).toEqual(
      expect.arrayContaining(['advanced fragment fidelity'])
    );
  });
});
