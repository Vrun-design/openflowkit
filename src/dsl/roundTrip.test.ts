import { describe, expect, it } from 'vitest';
import { compile, type CompileResult } from './compile';
import { format, serialize } from './serialize';

const fixtures = import.meta.glob('./fixtures/**/*.dsl', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const names = Object.keys(fixtures).sort();

/** Structure and attributes only: geometry, storage ids and parse bookkeeping are not the law. */
function normalize(scene: CompileResult) {
  const parent = (id: string | null) => (id === scene.frame.id ? null : id);
  const label = (node: { content: Record<string, unknown> }) => node.content.label;
  return {
    nodes: scene.nodes
      .filter((node) => !(node.metadata.dsl as { noteFor?: string }).noteFor)
      .map((node) => ({
        id: node.id, kind: node.kind, parentId: parent(node.parentId),
        label: label(node), shape: node.content.shape ?? null, color: node.content.color ?? null,
        colorMode: node.content.colorMode ?? null, icon: node.content.icon ?? null,
        subLabel: node.content.subLabel ?? null,
        appearance: node.appearance, attrs: (node.metadata.dsl as { attrs?: unknown }).attrs ?? null,
        notes: (node.metadata.dsl as { notes?: unknown }).notes ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    groups: scene.groups
      .map((group) => ({ id: group.id, parentId: parent(group.parentId), label: label(group), color: group.content.color ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    connectors: scene.connectors
      .map((connector) => ({
        source: connector.source.nodeId, target: connector.target.nodeId,
        anchors: [connector.source.anchor, connector.target.anchor],
        appearance: connector.appearance, labels: connector.labels.map((item) => item.text),
        attrs: (connector.metadata.dsl as { attrs?: unknown }).attrs ?? null,
      }))
      .sort((a, b) => `${a.source}->${a.target}`.localeCompare(`${b.source}->${b.target}`)),
    comments: (scene.frame.metadata.dsl as { comments?: unknown }).comments ?? null,
    reserved: (scene.frame.metadata.dsl as { reserved?: unknown }).reserved ?? null,
    align: (scene.frame.metadata.dsl as { align?: unknown }).align ?? null,
    animate: (scene.frame.metadata.dsl as { animate?: unknown }).animate ?? null,
  };
}

describe('round-trip laws over fixtures', () => {
  it('has fixtures for the language surface', () => {
    expect(names.length).toBeGreaterThanOrEqual(10);
  });

  it.each(names)('%s: format is idempotent', async (path) => {
    const canonical = await format(fixtures[path]!);
    expect(await format(canonical)).toBe(canonical);
  });

  it.each(names)('%s: serialize(compile) preserves structure and attributes', async (path) => {
    const first = await compile(fixtures[path]!);
    const second = await compile(serialize(first));
    expect(normalize(second)).toEqual(normalize(first));
  });

  it.each(names)('%s: serialized text re-parses without new errors', async (path) => {
    const first = await compile(fixtures[path]!);
    const recompiled = await compile(serialize(first));
    const errors = (scene: CompileResult) => scene.diagnostics.filter((item) => item.severity === 'error').length;
    expect(errors(recompiled)).toBe(errors(first));
  });
});
