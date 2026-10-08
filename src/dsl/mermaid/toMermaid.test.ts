import { afterAll, describe, expect, it } from 'vitest';
import { MERMAID_COMPAT_FIXTURES } from '../../../scripts/mermaid-compat-fixtures.mjs';
import { FLOWCHART_SYNTAX } from '../../services/dsl/fixtures/mermaid/flowchartSyntax';
import platform from '../../services/dsl/fixtures/mermaid/platform.mmd?raw';
import { mermaidToDsl } from '../../services/dsl/mermaidToDsl';
import { compile, type CompileResult } from '../compile';
import { dslNodeMeta } from '../sceneMeta';
import { colorInfoFor, connectorDashed, markerName, nodeLabel } from '../text';
import { dslShapeWord, isHexColor } from '../vocabulary';
import { diagramToMermaid } from './toMermaid';

/** Hex colours survive Mermaid (`style x fill:`); named palette colours are reported as losses instead. */
const hexColor = (node: Parameters<typeof colorInfoFor>[0]) => {
  const { word, fill } = colorInfoFor(node);
  return { color: word && isHexColor(word) ? word : undefined, fill };
};

/** Everything the two DSL texts must agree on, as plain data (not text, not geometry). */
function structure(result: CompileResult) {
  const nodes = result.nodes.filter((node) => !dslNodeMeta(node).noteFor);
  return {
    family: result.meta.family,
    nodes: orderedNodes(nodes.filter((node) => node.kind !== 'annotation')).map((node) => ({
      ...hexColor(node),
      id: node.id, label: nodeLabel(node), kind: node.kind, parent: node.parentId === result.frame.id ? 'frame' : node.parentId,
      shape: node.kind === 'sequence_participant' || node.kind === 'sequence_note' ? undefined : dslShapeWord(node.kind, node.content.shape, dslNodeMeta(node).shape),
      actor: node.content.seqParticipantKind,
      note: node.kind === 'sequence_note' ? [node.content.seqNotePosition, node.content.seqNoteTargets, node.content.seqMessageOrder] : undefined,
      activations: node.content.seqActivations,
    })),
    groups: result.groups.map((group) => ({ ...hexColor(group), id: group.id, label: nodeLabel(group), parent: group.parentId === result.frame.id ? 'frame' : group.parentId })).sort((a, b) => a.id.localeCompare(b.id)),
    edges: result.connectors.map((connector) => ({
      from: connector.source.nodeId, to: connector.target.nodeId, label: connector.labels[0]?.text,
      dashed: connectorDashed(connector), thick: connector.appearance.strokeWidth,
      head: markerName(connector.appearance.markerEnd), tail: markerName(connector.appearance.markerStart),
      kind: connector.semantics.seqMessageKind, order: connector.semantics.seqMessageOrder,
    })),
    fragments: result.nodes.filter((node) => node.kind === 'annotation').map((node) => ({
      label: node.content.label, condition: node.content.subLabel, order: node.content.seqMessageOrder,
      fragment: pickFragment(node),
    })),
  };
}

/** Participants keep their column order; everything else is compared by id. */
function orderedNodes<T extends { id: string; kind: string }>(nodes: T[]): T[] {
  const participants = nodes.filter((node) => node.kind === 'sequence_participant');
  return [...participants, ...nodes.filter((node) => node.kind !== 'sequence_participant').sort((a, b) => a.id.localeCompare(b.id))];
}

/** Fragment nesting as data: type, branch index, parent branch and the message range it spans. */
function pickFragment(node: { metadata: Record<string, unknown> }) {
  const meta = node.metadata.dsl as Record<string, unknown> | undefined;
  return meta && { type: meta.seqFragmentType, branch: meta.seqFragmentBranch, parent: meta.seqFragmentParent, start: meta.seqFragmentStart, end: meta.seqFragmentEnd };
}

interface Case { name: string; source: string }

const corpus: Case[] = [
  ...(MERMAID_COMPAT_FIXTURES as Array<{ name: string; source: string; family?: string; bucket?: string }>)
    .filter((fixture) => (fixture.family === 'flowchart' || fixture.family === 'sequence')
      && (fixture.bucket === 'editable_full' || fixture.bucket === 'editable_partial'))
    .map((fixture) => ({ name: `compat ${fixture.name}`, source: fixture.source })),
  ...FLOWCHART_SYNTAX.map((entry) => ({ name: `syntax ${entry.n}`, source: entry.s })),
  { name: 'platform.mmd', source: platform },
];

let roundTripped = 0;

describe('diagramToMermaid round trip over the Mermaid import corpus', () => {
  it('has the whole corpus', () => {
    expect(corpus.length).toBeGreaterThan(40);
  });

  // Declared last in this block so it runs after every case below has counted itself.
  afterAll(() => {
    expect(roundTripped, 'every corpus case round-trips').toBe(corpus.length);
  });

  for (const entry of corpus) {
    it(entry.name, async () => {
      const first = mermaidToDsl(entry.source);
      if ('error' in first) throw new Error(`${entry.name} failed to import: ${first.error}`);
      const before = await compile(first.dsl);
      const out = diagramToMermaid(before);
      expect(out.text).not.toBe('');
      const second = mermaidToDsl(out.text);
      if ('error' in second) throw new Error(`${second.error}\n${out.text}`);
      const after = await compile(second.dsl);
      expect(structure(after), out.text).toEqual(structure(before));
      roundTripped += 1;
    });
  }
});

describe('diagramToMermaid text', () => {
  it('writes shapes, edge styles, labels and subgraphs', async () => {
    const result = await compile('flowchart right\ntitle: Demo\ngroup Backend {\n  api = API [rounded]\n  db = Database [cylinder, #ff0000]\n}\nClient [diamond] -> api : "say \\"hi\\" #1"\napi --> db\nClient -- db [head: cross]\n');
    const { text, losses } = diagramToMermaid(result);
    expect(text).toContain('flowchart LR');
    expect(text).toContain('title: "Demo"');
    expect(text).toContain('subgraph backend["Backend"]');
    expect(text).toContain('api("API")');
    expect(text).toContain('db[("Database")]');
    expect(text).toContain('client{"Client"}');
    expect(text).toContain('client -->|"say #quot;hi#quot; #35;1"| api');
    expect(text).toContain('api -.-> db');
    expect(text).toContain('client --x db');
    expect(text).toContain('style db fill:#ff0000');
    expect(losses).toEqual(['positions and sizes']);
  });

  it('reports what Mermaid cannot say', async () => {
    const result = await compile('flowchart\nA [green, cloud] -> B [star, shadow]\nB -> C [green]\n');
    const { text, losses } = diagramToMermaid(result);
    expect(text).toContain('a@{ shape: cloud, label: "A" }');
    expect(text).toContain('b["B"]');
    expect(losses).toEqual(['positions and sizes', '2 colors', '1 shadow', '1 shape drawn as a box']);
  });

  it('writes sequence messages, notes, activations and fragments', async () => {
    const result = await compile('sequence\ntitle: Login\nparticipant U [actor]\nAPI = API Gateway\nU -> API : POST /login\nactivate API\nnote right of API : "check; ok"\nalt valid {\n  API --> U : token\n} else bad {\n  API -> U : denied [head: cross]\n}\ndeactivate API\n');
    const { text } = diagramToMermaid(result);
    expect(text).toBe([
      '---', 'title: "Login"', '---', 'sequenceDiagram',
      '  actor u as U', '  participant API as API Gateway',
      '  u->>API: POST /login', '  activate API', '  Note right of API: check#59; ok',
      '  alt valid', '    API-->>u: token', '  else bad', '    API-xu: denied', '  end',
      '  deactivate API', '',
    ].join('\n'));
  });

  it('escapes # and ; once, in message, note and loop text', async () => {
    const result = await compile('sequence\nA -> B : "C# and #1; x"\nloop "a; b #2" {\n  B -> A : hi\n}\nnote over A : "n#1; z"\n');
    const { text } = diagramToMermaid(result);
    expect(text).toContain('a->>b: C#35; and #35;1#59; x');
    expect(text).toContain('loop a#59; b #35;2');
    expect(text).toContain('Note over a: n#35;1#59; z');
    expect(text).not.toMatch(/#35#59;|#35#35;/);
  });

  it('escapes backticks, which Mermaid reads as markdown', async () => {
    const result = await compile('flowchart\na = "`md`"\na -> B\n');
    expect(diagramToMermaid(result).text).toContain('a["#96;md#96;"]');
  });

  it('reports a flow edge as animated and keeps its line style', async () => {
    const solid = diagramToMermaid(await compile('flowchart\nA -> B [flow]\n'));
    expect(solid.text).toContain('a --> b');
    expect(solid.losses).toContain('1 animated edge');
    const dashed = diagramToMermaid(await compile('flowchart\nA --> B [flow]\n'));
    expect(dashed.text).toContain('a -.-> b');
    expect(dashed.losses).toContain('1 animated edge');
    // Plain `-->` is a dashed line in this DSL; no flag, no loss.
    expect(diagramToMermaid(await compile('flowchart\nA --> B\n')).losses).toEqual(['positions and sizes']);
  });

  it('reports what a group carries that Mermaid cannot', async () => {
    const result = await compile('flowchart\ngroup G [red] {\n  C\n}\n');
    expect(diagramToMermaid(result).losses).toEqual(['positions and sizes', '1 color']);
  });

  it('says so for a family it cannot write', async () => {
    const result = await compile('erd\nUser {\n  id\n}\n');
    expect(diagramToMermaid(result)).toEqual({ text: '', losses: ['Mermaid export supports flowchart and sequence diagrams, not erd'] });
  });
});
