import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { format, quote, serialize } from './serialize';

describe('serialize', () => {
  it('is deterministic and idempotent for canonical graph structure', async () => {
    const input = 'architecture\nAPI [green, aws/lambda]\nAPI --> DB : writes';
    const first = await format(input);
    const second = await format(first);
    expect(second).toBe(first);
    expect(first).toContain('API [green, aws/lambda]');
    expect(first).toContain('API --> DB : writes');
  });

  it('emits declarations only for nodes that need them', async () => {
    const scene = await compile('flowchart\nA [ellipse]\nA -> B\nB -> C : ok');
    const text = serialize(scene);
    expect(text).toContain('A [ellipse]');
    expect(text).not.toContain('B [');
    expect(text).toContain('A -> B');
    expect(text).toContain('B -> C : ok');
  });

  it('serializes canvas-created nodes in reading order', async () => {
    const scene = await compile('flowchart\nA -> B');
    const manual = { ...scene.nodes[0]!, id: 'manual', content: { label: 'Manual', shape: 'rounded' }, metadata: {}, transform: { ...scene.nodes[0]!.transform, translation: { x: 0, y: -100 } } };
    const text = serialize({ ...scene, nodes: [...scene.nodes, manual] });
    expect(text.indexOf('Manual')).toBeLessThan(text.indexOf('A -> B'));
  });

  it('reads presentation back from the scene, not from stale metadata', async () => {
    const scene = await compile('flowchart\nA [blue, cylinder]');
    const node = scene.nodes[0]!;
    const recoloured = { ...scene, nodes: [{ ...node, content: { ...node.content, shape: 'diamond' }, appearance: { fill: '#fef2f2' } }] };
    const text = serialize(recoloured);
    expect(text).toContain('A [diamond, red]');
    expect(text).not.toContain('blue');
  });

  it('quotes reserved labels and emits explicit ids when needed', async () => {
    const scene = await compile('flowchart\n"group" -> custom = Long Name');
    expect(serialize(scene)).toContain('"group" -> custom = Long Name');
    expect(quote('Join')).toBe('Join');
    expect(quote('group')).toBe('"group"');
    expect(quote('Cache: L2')).toBe('"Cache: L2"');
  });

  it('keeps full-line comments attached to their statement', async () => {
    const text = 'flowchart\n// the start\nA [ellipse]\n// then edge\nA -> B';
    const canonical = await format(text);
    expect(canonical).toContain('// the start\nA [ellipse]');
    expect(canonical).toContain('// then edge\nA -> B');
    expect(await format(canonical)).toBe(canonical);
  });

  it('keeps reserved model statements verbatim', async () => {
    const input = 'architecture\nAPI\nview context of API';
    const canonical = await format(input);
    expect(canonical).toContain('view context of API');
    expect(await format(canonical)).toBe(canonical);
  });

  it('emits notes and align hints', async () => {
    const scene = await compile('flowchart\nA\nB\nnote A : retries\nalign row A, B');
    const text = serialize(scene);
    expect(text).toContain('note A : retries');
    expect(text).toContain('align row A, B');
    expect(text.indexOf('align row A, B')).toBeLessThan(text.indexOf('note A : retries'));
  });
});
