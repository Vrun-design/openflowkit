import { describe, expect, it } from 'vitest';
import {
  animateBlockLines, animateFromJson, animateToJson, extractAnimateBlock,
  formatAnimateDuration, parseAnimateDuration, timelineFromAnimate,
} from './animate';
import { compile } from './compile';
import { parseDocument } from './document';
import { serialize } from './serialize';
import { animEdge, animNode, animPage } from '../opencanvas/domain/animation/testFixtures';

const BLOCK = `%% ofk 1
flowchart

a -> b
b -> c

animate build 6s loop {
  step a, b
  step b -> c : POST
  step c hold 2s
}
`;

describe('animate block', () => {
  it('parses the header and every step form', () => {
    const document = parseDocument(BLOCK);
    const { block, segments } = extractAnimateBlock(document.segments, []);
    expect(block).toEqual({
      preset: 'build',
      durationMs: 6000,
      loop: true,
      steps: [
        { refs: ['a', 'b'] },
        { refs: ['b', 'c'], edge: true, label: 'POST' },
        { refs: ['c'], holdMs: 2000 },
      ],
    });
    // The block never reaches the family parser.
    expect(segments.some((segment) => segment.tokens[0]?.value === 'animate')).toBe(false);
  });

  it('round-trips: parse(serialize) is byte-identical and idempotent', async () => {
    const compiled = await compile(BLOCK);
    const scene = { frame: compiled.frame, nodes: compiled.nodes, groups: compiled.groups, connectors: compiled.connectors };
    const once = serialize(scene);
    expect(once).toBe(BLOCK);
    const again = await compile(once);
    expect(serialize({ frame: again.frame, nodes: again.nodes, groups: again.groups, connectors: again.connectors })).toBe(once);
  });

  it('serializes a block without inventing one', async () => {
    const compiled = await compile('flowchart\na -> b\n');
    const scene = { frame: compiled.frame, nodes: compiled.nodes, groups: compiled.groups, connectors: compiled.connectors };
    expect(serialize(scene)).not.toContain('animate');
  });

  it('warns on unknown presets and keeps going', () => {
    const diagnostics: import('./ast').DslDiagnostic[] = [];
    const document = parseDocument('flowchart\nanimate zoom 10s {\n  step a\n}\n');
    const { block } = extractAnimateBlock(document.segments, diagnostics);
    expect(block?.preset).toBe('build');
    expect(diagnostics.some((item) => item.code === 'W190' && item.message.includes('zoom'))).toBe(true);
  });

  it('warns and closes an unclosed block', () => {
    const diagnostics: import('./ast').DslDiagnostic[] = [];
    const document = parseDocument('flowchart\nanimate build {\n  step a\n');
    const { block } = extractAnimateBlock(document.segments, diagnostics);
    expect(block?.steps).toEqual([{ refs: ['a'] }]);
    expect(diagnostics.some((item) => item.code === 'W103')).toBe(true);
  });

  it('reads durations and formats them back', () => {
    expect(parseAnimateDuration('10s')).toBe(10_000);
    expect(parseAnimateDuration('8500ms')).toBe(8500);
    expect(parseAnimateDuration('2')).toBe(2000);
    expect(parseAnimateDuration('soon')).toBeNull();
    expect(parseAnimateDuration('0')).toBeNull();
    expect(formatAnimateDuration(10_000)).toBe('10s');
    expect(formatAnimateDuration(8500)).toBe('8500ms');
  });

  it('survives malformed metadata', () => {
    expect(animateFromJson(null)).toBeNull();
    expect(animateFromJson({ preset: 'zoom', steps: [{ refs: ['a'] }] })?.preset).toBe('build');
    expect(animateFromJson({ steps: [{ refs: [] }, { refs: ['a'], holdMs: -5 }] })?.steps)
      .toEqual([{ refs: ['a'] }]);
  });

  it('resolves refs to scene ids and cameras, warning on unknown nodes', () => {
    const page = animPage(
      [animNode('a', 0, 0), animNode('b', 0, 100)],
      [animEdge('ab', 'a', 'b')],
    );
    const diagnostics: import('./ast').DslDiagnostic[] = [];
    const block = {
      preset: 'build' as const, loop: false,
      steps: [
        { refs: ['a', 'b'] },
        { refs: ['a', 'b'], edge: true, label: 'POST' },
        { refs: ['ghost'] },
      ],
    };
    const timeline = timelineFromAnimate(page, block, diagnostics);
    expect(timeline.preset).toBe('build');
    expect(timeline.steps[0]).toMatchObject({ nodeIds: ['a', 'b'] });
    expect(timeline.steps[1]?.connectorIds).toEqual(['ab']);
    expect(timeline.steps[1]?.note).toBe('POST');
    expect(timeline.steps[0]?.camera).toMatchObject({ x: 0, y: 0 });
    expect(timeline.steps[2]?.nodeIds).toEqual([]);
    expect(diagnostics.some((item) => item.code === 'W122')).toBe(true);
    expect(timeline.durationMs).toBe(2 * 1700 + 2600);
  });

  it('honours a header duration by scaling the clip', () => {
    const page = animPage([animNode('a', 0, 0), animNode('b', 0, 100)]);
    const timeline = timelineFromAnimate(page, {
      preset: 'pulse', loop: true, durationMs: 4000, steps: [{ refs: ['a'] }, { refs: ['b'] }],
    });
    expect(timeline.loop).toBe(true);
    expect(timeline.durationMs).toBe(4000);
  });

  it('round-trips the JSON form', () => {
    const block = {
      preset: 'walkthrough' as const, loop: true, durationMs: 5000,
      steps: [{ refs: ['a'], holdMs: 900 }, { refs: ['a', 'b'], edge: true, label: 'POST' }],
    };
    expect(animateFromJson(animateToJson(block))).toEqual(block);
  });

  it('emits the canonical block text', () => {
    expect(animateBlockLines({
      preset: 'build', durationMs: 6000, loop: true,
      steps: [{ refs: ['a', 'b'] }, { refs: ['b', 'c'], edge: true, label: 'POST' }, { refs: ['c'], holdMs: 2000 }],
    })).toEqual([
      'animate build 6s loop {',
      '  step a, b',
      '  step b -> c : POST',
      '  step c hold 2s',
      '}',
    ]);
  });

  it('works in a non-graph family too', async () => {
    const compiled = await compile('sequence\na -> b : hi\n\nanimate pulse {\n  step a\n}\n');
    expect(compiled.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const scene = { frame: compiled.frame, nodes: compiled.nodes, groups: compiled.groups, connectors: compiled.connectors };
    expect(serialize(scene)).toContain('animate pulse {');
    expect(compiled.nodes.length).toBeGreaterThan(0);
  });
});
