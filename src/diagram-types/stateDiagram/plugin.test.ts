import { describe, expect, it } from 'vitest';
import { STATE_DIAGRAM_PLUGIN } from './plugin';

describe('STATE_DIAGRAM_PLUGIN', () => {
  it('parses basic state transitions through the legacy adapter path', () => {
    const input = `
      stateDiagram-v2
      [*] --> Idle
      Idle --> Running : start
      Running --> [*]
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('returns a header error when state diagram declaration is missing', () => {
    const result = STATE_DIAGRAM_PLUGIN.parseMermaid('Idle --> Running');
    expect(result.error).toContain('Missing chart type declaration');
  });

  it('parses colon-style transition labels used by state diagrams', () => {
    const input = `
      stateDiagram-v2
      Idle --> Running : start
      Running --> Idle : reset
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].label).toBe('start');
    expect(result.edges[1].label).toBe('reset');
  });

  it('keeps composite-state children parented when block closes with }', () => {
    const input = `
      stateDiagram-v2
      state Working {
        [*] --> Busy
        Busy --> Idle
      }
      Idle --> [*]
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    const busyNode = result.nodes.find((node) => node.id === 'Busy');
    expect(busyNode?.parentId).toBe('Working');
  });

  it('renders state notes as annotation nodes instead of rejecting them', () => {
    const input = `
      stateDiagram-v2
      [*] --> Idle
      note right of Idle: Waiting for input
      Idle --> Running
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.some((node) => node.type === 'annotation')).toBe(true);
    expect(result.edges.some((edge) => edge.source.startsWith('state-note-') && edge.target === 'Idle')).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('note syntax'))).not.toBe(true);
  });

  it('parses explicit fork and join control states', () => {
    const input = `
      stateDiagram-v2
      state FanOut <<fork>>
      state FanIn <<join>>
      [*] --> FanOut
      FanOut --> BranchA
      FanOut --> BranchB
      BranchA --> FanIn
      BranchB --> FanIn
      FanIn --> [*]
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.find((node) => node.id === 'FanOut')?.data.stateControlKind).toBe('fork');
    expect(result.nodes.find((node) => node.id === 'FanIn')?.data.stateControlKind).toBe('join');
  });

  it('returns deterministic diagnostics for invalid direction and malformed transition arrows', () => {
    const input = `
      stateDiagram-v2
      [*] --> Idle
      direction RL
      Idle -> Running
    `;

    const result = STATE_DIAGRAM_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.diagnostics?.some((message) => message.includes('Invalid stateDiagram direction syntax at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Invalid stateDiagram transition syntax at line'))).toBe(true);
  });
});
