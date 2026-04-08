import { describe, expect, it } from 'vitest';
import { detectMermaidDiagramType, extractMermaidDiagramHeader } from './detectDiagramType';

describe('detectMermaidDiagramType', () => {
  it('detects flowchart and graph headers', () => {
    expect(detectMermaidDiagramType('flowchart TD\nA-->B')).toBe('flowchart');
    expect(detectMermaidDiagramType('graph LR\nA-->B')).toBe('flowchart');
  });

  it('detects state diagram header', () => {
    expect(detectMermaidDiagramType('stateDiagram-v2\n[*]-->A')).toBe('stateDiagram');
  });

  it('detects target q2 families', () => {
    expect(detectMermaidDiagramType('classDiagram\nA <|-- B')).toBe('classDiagram');
    expect(detectMermaidDiagramType('erDiagram\nA ||--o{ B : has')).toBe('erDiagram');
    expect(detectMermaidDiagramType('mindmap\nroot')).toBe('mindmap');
    expect(detectMermaidDiagramType('journey\ntitle Onboarding')).toBe('journey');
    expect(detectMermaidDiagramType('architecture-beta\nservice api')).toBe('architecture');
    expect(detectMermaidDiagramType('sequenceDiagram\nparticipant A')).toBe('sequence');
  });

  it('skips empty and comment lines', () => {
    const input = `
%% comment

flowchart TD
A --> B
`;
    expect(detectMermaidDiagramType(input)).toBe('flowchart');
  });

  it('returns null for unknown or missing headers', () => {
    expect(detectMermaidDiagramType('A --> B')).toBeNull();
    expect(detectMermaidDiagramType('')).toBeNull();
  });

  it('preserves unsupported Mermaid headers for higher-level routing', () => {
    expect(extractMermaidDiagramHeader('gitGraph\ncommit id: "A"')).toEqual({
      rawType: 'gitGraph',
    });
    expect(detectMermaidDiagramType('gitGraph\ncommit id: "A"')).toBeNull();
  });
});
