import { describe, expect, it } from 'vitest';
import { SEQUENCE_PLUGIN } from './plugin';

describe('SEQUENCE_PLUGIN', () => {
  it('has correct id and displayName', () => {
    expect(SEQUENCE_PLUGIN.id).toBe('sequence');
    expect(SEQUENCE_PLUGIN.displayName).toBe('Sequence Diagram');
  });

  it('parses a basic sequence diagram', () => {
    const input = `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello
    Bob-->>Alice: Hi back`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(2);
    expect(result.nodes[0].data.label).toBe('Alice');
    expect(result.nodes[1].data.label).toBe('Bob');
    expect(result.edges[0].data?.seqMessageKind).toBe('sync');
    expect(result.edges[1].data?.seqMessageKind).toBe('return');
  });

  it('parses actors', () => {
    const input = `sequenceDiagram
    actor User
    participant API`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].data.seqParticipantKind).toBe('actor');
    expect(result.nodes[1].data.seqParticipantKind).toBe('participant');
  });

  it('parses participants with aliases', () => {
    const input = `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Request`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].data.label).toBe('Alice');
    expect(result.nodes[0].data.seqParticipantAlias).toBe('Alice');
  });

  it('auto-creates participants from messages', () => {
    const input = `sequenceDiagram
    Alice->>Bob: Hello
    Bob->>Charlie: Hi`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((n) => n.data.label)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('handles self-messages', () => {
    const input = `sequenceDiagram
    participant A
    A->>A: Think`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].data?.seqMessageKind).toBe('self');
  });

  it('returns error for missing header', () => {
    const result = SEQUENCE_PLUGIN.parseMermaid('Alice->>Bob: Hello');
    expect(result.error).toBe('Missing sequenceDiagram header.');
  });

  it('returns error for no participants', () => {
    const result = SEQUENCE_PLUGIN.parseMermaid('sequenceDiagram\n%% empty');
    expect(result.error).toBe('No participants found.');
  });

  it('positions participants horizontally', () => {
    const input = `sequenceDiagram
    participant A
    participant B
    participant C`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.nodes[0].position.x).toBe(0);
    expect(result.nodes[1].position.x).toBe(220);
    expect(result.nodes[2].position.x).toBe(440);
  });

  it('skips control flow keywords', () => {
    const input = `sequenceDiagram
    participant A
    participant B
    loop Every minute
    A->>B: Ping
    end`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.some((node) => node.type === 'annotation')).toBe(true);
    expect(result.edges).toHaveLength(1);
  });

  it('handles async arrows', () => {
    const input = `sequenceDiagram
    A-)B: async call`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.edges[0].data?.seqMessageKind).toBe('async');
  });

  it('creates visible note and fragment nodes for sequence annotations', () => {
    const input = `sequenceDiagram
    participant A
    participant B
    note right of A: warm cache
    alt success
      A->>B: Request
    else failure
      B-->>A: Error
    end`;

    const result = SEQUENCE_PLUGIN.parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.some((node) => node.type === 'sequence_note')).toBe(true);
    expect(result.nodes.some((node) => node.type === 'annotation')).toBe(true);
    expect(result.edges[0].data?.seqFragment?.type).toBe('alt');
  });
});
