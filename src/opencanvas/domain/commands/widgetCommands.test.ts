import { describe, expect, it } from 'vitest';
import type { ScenePage } from '../document/types';
import { createWidgetNode } from '../nodes/widgetNode';
import { buildSetWidgetStateCommand } from './widgetCommands';

const base: ScenePage = {
  id: 'p', name: 'p', diagramKind: 'flowchart',
  layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
  nodes: [], connectors: [], metadata: {}, extensions: {},
};
const page: ScenePage = {
  ...base,
  nodes: [
    createWidgetNode(base, { id: 'toggle', widget: 'toggle', at: { x: 0, y: 0 }, checked: true }),
    createWidgetNode(base, { id: 'tabs', widget: 'tabs', at: { x: 0, y: 0 }, active: 1 }),
    createWidgetNode(base, { id: 'button', widget: 'button', at: { x: 0, y: 0 }, variant: 'primary' }),
    { ...createWidgetNode(base, { id: 'shape', widget: 'toggle', at: { x: 0, y: 0 } }), kind: 'process' },
  ],
};

describe('buildSetWidgetStateCommand', () => {
  it('sets state on widgets only, as one batch with the before kept for undo', () => {
    const command = buildSetWidgetStateCommand(page, ['toggle', 'shape'], { checked: false });
    expect(command).toMatchObject({ kind: 'batch', commands: [{ kind: 'set-node', before: { content: { checked: true } }, after: { content: { checked: false } } }] });
  });

  it('is null when nothing would change', () => {
    expect(buildSetWidgetStateCommand(page, ['toggle'], { checked: true })).toBeNull();
    expect(buildSetWidgetStateCommand(page, ['tabs'], { active: 1 })).toBeNull();
    expect(buildSetWidgetStateCommand(page, [], { checked: false })).toBeNull();
  });

  it('clamps values, and clears active and variant', () => {
    const value = buildSetWidgetStateCommand(page, ['toggle'], { value: 4 });
    expect(value).toMatchObject({ commands: [{ after: { content: { value: 1 } } }] });
    const cleared = buildSetWidgetStateCommand(page, ['tabs', 'button'], { active: -1, variant: null });
    const after = cleared && cleared.kind === 'batch' ? cleared.commands.map((entry) => entry.kind === 'set-node' ? entry.after.content : null) : [];
    expect(after.every((content) => content && !('active' in content) && !('variant' in content))).toBe(true);
  });

  it('leaves locked widgets alone', () => {
    const locked = { ...page, layers: [{ ...page.layers[0]!, locked: true }] };
    expect(buildSetWidgetStateCommand(locked, ['toggle'], { checked: false })).toBeNull();
  });
});
