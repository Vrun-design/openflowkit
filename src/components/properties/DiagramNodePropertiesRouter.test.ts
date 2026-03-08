import { describe, expect, it } from 'vitest';
import { NodeType } from '@/lib/types';
import { resolveNodePropertiesPanelDiagramType } from './DiagramNodePropertiesRouter';

describe('resolveNodePropertiesPanelDiagramType', () => {
  it('keeps the active diagram type for generic flowchart nodes', () => {
    expect(resolveNodePropertiesPanelDiagramType(NodeType.PROCESS, 'flowchart')).toBe('flowchart');
  });

  it('routes mindmap nodes to the mindmap property panel even on a flowchart tab', () => {
    expect(resolveNodePropertiesPanelDiagramType(NodeType.MINDMAP, 'flowchart')).toBe('mindmap');
  });

  it('routes other specialized node families to their dedicated property panels', () => {
    expect(resolveNodePropertiesPanelDiagramType(NodeType.JOURNEY, 'flowchart')).toBe('journey');
    expect(resolveNodePropertiesPanelDiagramType(NodeType.ARCHITECTURE, 'flowchart')).toBe('architecture');
    expect(resolveNodePropertiesPanelDiagramType(NodeType.CLASS, 'flowchart')).toBe('classDiagram');
    expect(resolveNodePropertiesPanelDiagramType(NodeType.ER_ENTITY, 'flowchart')).toBe('erDiagram');
  });
});
