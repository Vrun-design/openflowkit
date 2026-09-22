import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('parse', () => {
  it('parses headers, chains, labels, attrs, reverse and bidirectional edges', () => {
    const diagram = parse(`%% ofk 1\nflowchart right\nA [circle, red] -> B -> C : ships [thick]\nD <- C\nD <-> E`);
    expect(diagram).toMatchObject({ version: 1, family: 'flowchart', direction: 'right' });
    expect(diagram.statements).toHaveLength(4);
    expect(diagram.statements[0]).toMatchObject({ kind: 'edge', from: { label: 'A', attributes: [{ value: 'circle' }, { value: 'red' }] }, to: { label: 'B' } });
    expect(diagram.statements[1]).toMatchObject({ kind: 'edge', from: { label: 'B' }, to: { label: 'C' }, label: 'ships', attributes: [{ value: 'thick' }] });
    expect(diagram.statements[2]).toMatchObject({ kind: 'edge', from: { label: 'C' }, to: { label: 'D' }, arrow: '->' });
    expect(diagram.statements[3]).toMatchObject({ kind: 'edge', arrow: '<->' });
  });

  it('expands fan-in and fan-out edges', () => {
    const diagram = parse('flowchart\nA, B -> C\nC -> D, E : yes');
    expect(diagram.statements.map((statement) => statement.kind === 'edge' ? [statement.from.label, statement.to.label, statement.label] : [])).toEqual([
      ['A', 'C', undefined], ['B', 'C', undefined], ['C', 'D', 'yes'], ['C', 'E', 'yes'],
    ]);
  });

  it('parses explicit ids, nested groups, semicolons, and comments', () => {
    const diagram = parse(`architecture\ngroup edge = Edge Tier [blue] { CDN; Inner { origin = Origin } }\n// kept`);
    expect(diagram.statements[0]).toMatchObject({
      kind: 'group', group: { id: 'edge', label: 'Edge Tier', attributes: [{ value: 'blue' }] },
      statements: [{ kind: 'node', node: { label: 'CDN' } }, { kind: 'group', group: { label: 'Inner' }, statements: [{ kind: 'node', node: { id: 'origin', label: 'Origin' } }] }],
    });
    expect(diagram.comments).toEqual([{ text: 'kept', line: 3 }]);
  });

  it('keeps phase-5 kinds and records without giving them semantics', () => {
    const diagram = parse('architecture\nmodel {\n system Shop {\n container API\n }\n view context of Shop\n}');
    expect(diagram.statements[0]).toMatchObject({ kind: 'group', reservedKind: 'model', statements: [{ kind: 'group', reservedKind: 'system', group: { label: 'Shop' }, statements: [{ kind: 'node', reservedKind: 'container', node: { label: 'API' } }] }, { kind: 'reserved', keyword: 'view', value: 'context of Shop' }] });
  });

  it('returns diagnostics and partial output for bad input', () => {
    const diagram = parse('Flowchart\nGood\nBad [oops\ngroup Open {\nChild');
    expect(diagram.family).toBe('architecture');
    expect(diagram.statements).toMatchObject([{ kind: 'node', node: { label: 'Flowchart' } }, { kind: 'node', node: { label: 'Good' } }, { kind: 'group', group: { label: 'Open' } }]);
    expect(diagram.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(['I002', 'I003', 'W110', 'W101', 'W103']));
  });

  it('splits trailing attribute lists by intent: edge flags on the edge, node words on the node', () => {
    const diagram = parse('flowchart\nA -> B [dashed, red]\nA -> C [thick, head: circle]\nA -> D [cylinder]');
    expect(diagram.statements[0]).toMatchObject({ kind: 'edge', attributes: [{ value: 'dashed' }], to: { label: 'B', attributes: [{ value: 'red' }] } });
    expect(diagram.statements[1]).toMatchObject({ kind: 'edge', attributes: [{ value: 'thick' }, { key: 'head', value: 'circle' }], to: { label: 'C', attributes: [] } });
    expect(diagram.statements[2]).toMatchObject({ kind: 'edge', attributes: [], to: { label: 'D', attributes: [{ value: 'cylinder' }] } });
  });

  it('ignores colons inside attribute lists and rejoins pin coordinates', () => {
    const diagram = parse('flowchart\nA [pin: 240,80]\nA -> B [x: 1] : goes\nB -> C : goes [from: right, to: left]');
    expect(diagram.statements[0]).toMatchObject({ kind: 'node', node: { attributes: [{ key: 'pin', value: '240,80' }] } });
    // `[…]` before `:` belongs to the node it follows, even when it holds edge-looking keys.
    expect(diagram.statements[1]).toMatchObject({ kind: 'edge', label: 'goes', to: { label: 'B', attributes: [{ key: 'x', value: '1' }] } });
    // `[…]` after the label belongs to the edge.
    expect(diagram.statements[2]).toMatchObject({
      kind: 'edge', label: 'goes',
      attributes: [{ key: 'from', value: 'right' }, { key: 'to', value: 'left' }],
      to: { label: 'C', attributes: [] },
    });
  });

  it('keeps unknown attributes and repairs invalid explicit ids', () => {
    const diagram = parse('flowchart\na.b = Cache [cylinder, octahedron]');
    expect(diagram.statements[0]).toMatchObject({ kind: 'node', node: { id: 'a-b', label: 'Cache', attributes: [{ value: 'cylinder' }, { value: 'octahedron' }] } });
    expect(diagram.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(['W120', 'W131']));
  });

  it('never throws for arbitrary UTF-16 input', () => {
    let seed = 0x5eed;
    for (let sample = 0; sample < 1_000; sample += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const length = seed % 100;
      let input = '';
      for (let index = 0; index < length; index += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        input += String.fromCharCode(seed & 0xffff);
      }
      expect(() => parse(input)).not.toThrow();
    }
  });
});

describe('parse for non-graph families', () => {
  it('does not report valid sequence or class lines as dropped', () => {
    const sequence = parse('sequence\nparticipant A [actor]\nA -> B : hi\nactivate B\nloop retry {\n  B -> A : ok\n}\nnote over A,B : done');
    expect(sequence.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const cls = parse('class\nclass Order {\n  +id: int\n  +total(): Money\n}\nOrder --|> Base');
    expect(cls.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
  });

  it('still reports shared diagnostics for them', () => {
    expect(parse('sequence\nA -> B : "open').diagnostics.map((item) => item.code)).toContain('W102');
  });
});
