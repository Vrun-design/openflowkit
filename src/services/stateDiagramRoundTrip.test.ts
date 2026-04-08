import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import { toMermaid } from './exportService';

describe('stateDiagram round-trip', () => {
  it('preserves family and transition labels through parse/export/parse', () => {
    const source = `
      stateDiagram-v2
      [*] --> Idle
      Idle --> Running : start
      Running --> [*]
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('stateDiagram');
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.edges).toHaveLength(3);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported.startsWith('stateDiagram-v2')).toBe(true);
    expect(exported).toContain('Idle --> Running : start');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('stateDiagram');
    expect(second.edges).toHaveLength(first.edges.length);
    expect(second.edges.some((edge) => edge.label === 'start')).toBe(true);
  });

  it('preserves composite-state parenting through parse/export/parse', () => {
    const source = `
      stateDiagram-v2
      state Working {
        [*] --> Busy
        Busy --> Idle
      }
      Idle --> [*]
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('stateDiagram');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('state Working {');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('stateDiagram');
    const busyNode = second.nodes.find((node) => node.id === 'Busy');
    expect(busyNode?.parentId).toBe('Working');
  });

  it('preserves notes and control states through parse/export/parse', () => {
    const source = `
      stateDiagram-v2
      state FanOut <<fork>>
      state FanIn <<join>>
      [*] --> FanOut
      FanOut --> Idle
      Idle --> FanIn
      note right of Idle: Waiting for input
      FanIn --> [*]
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.nodes.some((node) => node.data.stateControlKind === 'fork')).toBe(true);
    expect(first.nodes.some((node) => node.data.stateControlKind === 'join')).toBe(true);
    expect(first.nodes.some((node) => node.data.stateNoteTarget === 'Idle')).toBe(true);

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('state FanOut <<fork>>');
    expect(exported).toContain('state FanIn <<join>>');
    expect(exported).toContain('note right of Idle: Waiting for input');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.nodes.some((node) => node.data.stateControlKind === 'fork')).toBe(true);
    expect(second.nodes.some((node) => node.data.stateControlKind === 'join')).toBe(true);
    expect(second.nodes.some((node) => node.data.stateNoteTarget === 'Idle')).toBe(true);
  });

  it('preserves composite state labels with aliases through parse/export/parse', () => {
    const source = `
      stateDiagram-v2
      state "Working Set" as WorkingSet {
        [*] --> Busy
        Busy --> Idle
      }
      note left of WorkingSet: Parent note
      Idle --> [*]
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('stateDiagram');
    expect(first.nodes.find((node) => node.id === 'WorkingSet')?.data.label).toBe('Working Set');

    const exported = toMermaid(first.nodes, first.edges);
    expect(exported).toContain('state "Working Set" as WorkingSet {');
    expect(exported).toContain('note left of WorkingSet: Parent note');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('stateDiagram');
    expect(second.nodes.find((node) => node.id === 'WorkingSet')?.data.label).toBe('Working Set');
    expect(second.nodes.some((node) => node.data.stateNoteTarget === 'WorkingSet')).toBe(true);
  });

  it('preserves explicit direction through parse/export/parse when provided', () => {
    const source = `
      stateDiagram-v2
      direction LR
      [*] --> Idle
      Idle --> Running
      Running --> [*]
    `;

    const first = parseMermaidByType(source);
    expect(first.error).toBeUndefined();
    expect(first.diagramType).toBe('stateDiagram');
    expect(first.direction).toBe('LR');

    const exported = toMermaid(first.nodes, first.edges, first.direction);
    expect(exported).toContain('direction LR');

    const second = parseMermaidByType(exported);
    expect(second.error).toBeUndefined();
    expect(second.diagramType).toBe('stateDiagram');
    expect(second.direction).toBe('LR');
  });
});
