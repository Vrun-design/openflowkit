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

  // A label typed on the canvas is whatever the user typed; the text must read it back unchanged.
  it('writes every canvas label so it re-reads as itself, in every family', async () => {
    const sources: Record<string, string> = {
      flowchart: 'flowchart\nA -> B : go', state: 'state\nA -> B : go', sequence: 'sequence\nA -> B : go',
      architecture: 'architecture\nA -> B : go\ngroup G {\n  C\n}',
      erd: 'erd\nA { id int pk }\nB { id int pk }\nA 1:N B : go', class: 'class\nA { +id: int }\nB { +id: int }\nA --> B : go',
      mindmap: 'mindmap\ncentral: A\n- B',
    };
    const labels = ['Say "hi"', 'Loading...', 'v1..v2', 'opt --verbose', 'A || B', 'Polo|x', 'one o{ many', '  padded', 'trail ', 'two  spaces', 'tab\tx', 'line1\nline2', 'trail\\', 'note this', 'store'];
    const failures: string[] = [];
    for (const [family, source] of Object.entries(sources)) {
      for (const label of labels) {
        const compiled = await compile(source);
        const edge = family === 'mindmap' ? undefined : compiled.connectors[0];
        const scene = {
          ...compiled,
          nodes: compiled.nodes.map((node) => node.content.label === 'A' ? { ...node, content: { ...node.content, label } } : node),
          connectors: compiled.connectors.map((connector) => connector === edge ? { ...connector, labels: [{ ...connector.labels[0]!, text: label }] } : connector),
        };
        const again = await compile(serialize(scene));
        const ok = again.nodes.some((candidate) => candidate.content.label === label)
          && again.nodes.length === scene.nodes.length && again.connectors.length === scene.connectors.length
          && (!edge || again.connectors[0]?.labels[0]?.text === label);
        if (!ok) failures.push(`${family} ${JSON.stringify(label)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('quotes exactly the values that do not lex back to themselves as words', () => {
    for (const bare of ['Join', 'API Gateway', 'a/b', 'https://x.io/a', 'v2.1', 'C# app', 'trail\\']) expect(quote(bare)).toBe(bare);
    for (const value of ['Loading...', 'a -- b', 'x || y', 'Polo|x', 'Say "hi"', ' lead', 'tail ', 'a  b', 'a\tb', 'note x', '...etc', 'a ; b']) {
      expect(quote(value)).toBe(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    }
  });

  it('keeps two canvas nodes apart when their labels differ only in spacing', async () => {
    const compiled = await compile('flowchart\nA -> B');
    const scene = { ...compiled, nodes: compiled.nodes.map((node) => ({ ...node, content: { ...node.content, label: node.content.label === 'A' ? 'API  Gateway' : 'API Gateway' } })) };
    const again = await compile(serialize(scene));
    expect(again.nodes.map((node) => node.content.label).sort()).toEqual(['API  Gateway', 'API Gateway']);
    expect(again.connectors).toHaveLength(1);
  });
});

