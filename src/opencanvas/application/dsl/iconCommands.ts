// Taking icons off nodes: one node, a selection, or a whole diagram. Each is
// one undo step, and a diagram node remembers the choice in its DSL metadata
// so regenerating from text does not bring the icon back.
import type { DocumentCommand, SetNodeCommand } from '../../domain/commands/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { diagramPalette, paletteResolver } from '../../domain/nodes/nodePalette';
import { frameScene } from '../../../dsl/frameScene';
import { dslFrameRaw, dslNodeMeta } from '../../../dsl/sceneMeta';
import { measureNodeSize } from '../../../dsl/sizing';
import { canonicalShapeWord, nodeAppearance, SHAPE_WORDS } from '../../../dsl/vocabulary';

export function hasIcon(node: SceneNode): boolean {
  return node.kind === 'architecture' && typeof node.content.icon === 'string' && node.content.icon !== '';
}

/** The icon on this node came from its label, not from the author. */
export function hasAutoIcon(node: SceneNode): boolean {
  const auto = dslNodeMeta(node).autoIcon;
  return hasIcon(node) && auto !== undefined && node.content.icon === auto;
}

function record(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

/**
 * The node as a plain shape again, centred where the card was. A compiled node
 * gets back the shape, size and colours its text gives it; `optOut` writes
 * `icon: none` so the next compile leaves it plain too.
 */
export function withoutIcon(node: SceneNode, optOut: boolean): SceneNode {
  const {
    icon: _icon, archProvider: _provider, archResourceType: _resource,
    archIconPackId: _pack, archIconShapeId: _shape, assetPresentation: _presentation, ...content
  } = node.content;
  const raw = node.metadata.dsl;
  // A canvas-made icon node has no text behind it: keep its box, draw a rectangle.
  if (!raw || typeof raw !== 'object') {
    return { ...node, kind: 'process', content: { shape: 'rectangle', ...content } };
  }
  const meta = dslNodeMeta(node);
  const spec = SHAPE_WORDS[canonicalShapeWord(meta.shape ?? 'rect') ?? 'rect']!;
  const { color: _color, customColor: _custom, colorMode: _mode, ...plain } = content;
  const label = typeof node.content.label === 'string' ? node.content.label : '';
  const subLabel = typeof node.content.subLabel === 'string' ? node.content.subLabel : undefined;
  const size = measureNodeSize({ kind: spec.kind, label, ...(subLabel ? { subLabel } : {}), hasIcon: false, spec });
  const swatch = paletteResolver(diagramPalette(record(record(raw).appearance).palette));
  const { autoIcon: _auto, ...dsl } = record(raw);
  const { x, y } = node.transform.translation;
  return {
    ...node,
    kind: spec.kind,
    size,
    transform: { ...node.transform, translation: { x: x + (node.size.width - size.width) / 2, y: y + (node.size.height - size.height) / 2 } },
    content: { ...plain, ...(spec.shape ? { shape: spec.shape } : {}) },
    appearance: nodeAppearance(meta.color, meta.fill ?? 'pastel', node.appearance.shadow === true, swatch),
    metadata: { ...node.metadata, dsl: optOut ? { ...dsl, icon: 'none' } : dsl },
  };
}

function strip(page: ScenePage, node: SceneNode, optOut: boolean): SetNodeCommand {
  return { kind: 'set-node', id: `remove-icon:${node.id}`, label: 'Remove icon', pageId: page.id, before: node, after: withoutIcon(node, optOut) };
}

/** Remove the icon from every unlocked selected node that has one. */
export function buildRemoveIconCommand(page: ScenePage, ids: readonly string[]): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands = page.nodes
    .filter((node) => selected.has(node.id) && hasIcon(node) && !states.get(node.id)?.locked)
    .map((node) => strip(page, node, true));
  return commands.length ? { kind: 'batch', id: 'remove-icon', label: 'Remove icon', commands } : null;
}

/**
 * `icons: off` for one diagram: every auto icon comes off in place (positions
 * kept) and the frame records the directive for the text. Icons the author
 * chose stay.
 */
export function buildAutoIconsOffCommand(page: ScenePage, frameId: string): DocumentCommand | null {
  const scene = frameScene(page, frameId);
  if (!scene) return null;
  const frame: SetNodeCommand = {
    kind: 'set-node', id: `icons-off:${frameId}`, label: 'Turn off icons from labels', pageId: page.id,
    before: scene.frame,
    after: { ...scene.frame, metadata: { ...scene.frame.metadata, dsl: { ...dslFrameRaw(scene.frame), icons: 'off' } } },
  };
  const commands = [frame, ...scene.nodes.filter(hasAutoIcon).map((node) => strip(page, node, false))];
  return { kind: 'batch', id: `icons-off:${frameId}`, label: 'Turn off icons from labels', commands };
}
