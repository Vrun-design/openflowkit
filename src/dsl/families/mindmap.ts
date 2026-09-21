import type { SceneConnector, SceneNode } from '../../opencanvas/domain/document/types';
import type { Size2d } from '../../opencanvas/domain/geometry/types';
import { measurePortableText } from '../../opencanvas/domain/text/measurement';
import { nonVisualAttributes, readAttributes, typedFrom } from '../attributes';
import { tokenDiagnostic } from '../diagnostics';
import { attrsToJson, dslFrameRaw, dslNodeMeta, type CanonicalAttribute, type DslFrameScene } from '../sceneMeta';
import type { DslSegment } from '../segments';
import { attributeText, commentLines, quote, slugifyDslId } from '../text';
import { COLOR_WORDS, isHexColor, sortAttributes } from '../vocabulary';
import type { Family, FamilyContext, FamilyScene } from './types';

// The mindmap family: indentation is the structure (grammar §8.7). Layout is a
// pure tree — parents centred over their children, depth-1 branches split
// left/right by subtree span, mirroring the app's own mindmap engine.

const ROOT_GAP = 300;
const BRANCH_GAP = 224;
const VERTICAL_GAP = 40;
const PADDING = { top: 96, right: 80, bottom: 72, left: 80 };
const MAX_DEPTH = 6;

/** DSL shape word ↔ mindmap wrapper (renderer vocabulary). */
const WRAPPERS: Readonly<Record<string, string>> = {
  rect: 'square', rounded: 'rounded', circle: 'double-circle', ellipse: 'stadium',
  hexagon: 'hexagon', component: 'subroutine',
};
const SHAPES_BY_WRAPPER: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(WRAPPERS).map(([word, wrapper]) => [wrapper, word]),
);

interface MindDraft {
  id: string;
  label: string;
  depth: number;
  line: number;
  parentId: string | null;
  children: string[];
  /** Canonical colour word or `#hex`, cascaded from the branch. */
  color?: string;
  fill: boolean;
  wrapper?: string;
  icon?: string;
  attrs: CanonicalAttribute[];
  comments: string[];
  size: Size2d;
  point: { x: number; y: number };
  side: 'left' | 'right';
  span: number;
}

const fontSizeAt = (depth: number): number => depth === 0 ? 14 : depth === 1 ? 13 : Math.max(11, 13 - (depth - 2));
const fontWeightAt = (depth: number): 600 | 700 => depth === 0 ? 700 : 600;

function nodeSize(label: string, depth: number): Size2d {
  return {
    width: Math.round(measurePortableText(label, { fontSize: fontSizeAt(depth), fontWeight: fontWeightAt(depth), overflow: 'visible' }).width + 44),
    height: depth === 0 ? 56 : 44,
  };
}

function indentOf(text: string, line: number): number {
  let indent = 0;
  for (const char of text.split('\n')[line - 1] ?? '') {
    if (char === ' ') indent += 1;
    else if (char === '\t') indent += 4;
    else break;
  }
  return indent;
}

interface CreateNodeInput {
  id: string;
  label: string;
  depth: number;
  parentId: string | null;
  line: number;
  typed: ReturnType<typeof typedFrom>;
  color: string | undefined;
  comments: readonly string[];
}

function createNode(input: CreateNodeInput): MindDraft {
  const { typed } = input;
  return {
    id: input.id, label: input.label, depth: input.depth, line: input.line, parentId: input.parentId,
    children: [], color: input.color, fill: typed.fill === 'bold',
    wrapper: typed.shape ? WRAPPERS[typed.shape] : undefined,
    ...(typed.icon ? { icon: typed.icon } : {}),
    // Icons do not render on mindmap nodes yet; they stay in the attrs so text round-trips.
    attrs: [...nonVisualAttributes(typed, 'node'), ...(typed.icon ? [{ key: 'icon', value: typed.icon }] : [])],
    comments: [...input.comments],
    size: nodeSize(input.label, input.depth), point: { x: 0, y: 0 }, side: 'right', span: 1,
  };
}

function parseMindmap(segments: readonly DslSegment[], context: FamilyContext): { rootId: string | null; nodes: Map<string, MindDraft> } {
  const nodes = new Map<string, MindDraft>();
  const used = new Set<string>();
  const stack: Array<{ indent: number; id: string }> = [];
  let rootId: string | null = null;

  const uniqueId = (label: string): string => {
    const base = slugifyDslId(label);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return id;
  };
  const fail = (segment: DslSegment, code: 'W101' | 'W111' | 'W140', message: string, hint?: string): void => {
    context.diagnostics.push(tokenDiagnostic(code, 'warning', segment.tokens[0], message, hint));
  };

  for (const segment of segments) {
    const claimed = context.comments.claim(segment.line);
    if (segment.tokens[0]?.kind === 'comment' || segment.closes || segment.tokens.length === 0) continue;
    const tokens = segment.tokens;
    if (tokens.some((token) => token.kind === 'arrow')) {
      fail(segment, 'W111', 'Mindmaps have no edges; line dropped', 'indent a bullet instead');
      continue;
    }
    const keyword = tokens[0]!.value;
    const explicitRoot = keyword === 'central' || keyword === 'root';
    const bullet = keyword === '-' || keyword === '*';
    const bodyTokens = explicitRoot ? tokens.slice(tokens[1]?.value === ':' ? 2 : 1) : bullet ? tokens.slice(1) : tokens;
    const parsed = readAttributes(bodyTokens, context.diagnostics);
    const label = parsed.body.filter((token) => token.kind !== 'comment').map((token) => token.value).join(' ').replace(/\s+/g, ' ').trim();
    if (!label) {
      fail(segment, 'W101', 'Bullet needs a label', '- Growth');
      continue;
    }
    if (explicitRoot && rootId) {
      fail(segment, 'W101', 'Only one central topic is allowed; line dropped');
      continue;
    }
    const typed = typedFrom(parsed.attributes);
    const custom = typed.color && isHexColor(typed.color) ? typed.color : undefined;
    const color = custom ?? (typed.color ? typed.color : undefined);

    if (!rootId) {
      // The first content line is the root, bullet or not, `central:` or not.
      const node = createNode({ id: uniqueId(label), label, depth: 0, parentId: null, line: segment.line, typed, color, comments: claimed });
      nodes.set(node.id, node);
      rootId = node.id;
      stack.length = 0;
      continue;
    }
    const indent = explicitRoot ? 0 : indentOf(context.text, segment.line);
    while (stack.length > 0 && stack.at(-1)!.indent >= indent) stack.pop();
    const parentId = stack.at(-1)?.id ?? rootId;
    const parent = nodes.get(parentId)!;
    const depth = parent.depth + 1;
    if (depth > MAX_DEPTH) fail(segment, 'W140', `Depth above ${MAX_DEPTH} collapsed`, 'flatten the branch');
    const node = createNode({ id: uniqueId(label), label, depth: Math.min(depth, MAX_DEPTH), parentId, line: segment.line, typed, color, comments: claimed });
    nodes.set(node.id, node);
    nodes.get(parentId)!.children.push(node.id);
    stack.push({ indent, id: node.id });
  }
  return { rootId, nodes };
}

/** Leaf spans, then a cursor pass: parents centre over their children. */
function layoutTree(nodes: Map<string, MindDraft>, rootId: string): void {
  const measureSpan = (id: string): number => {
    const node = nodes.get(id)!;
    node.span = node.children.length === 0 ? 1 : node.children.reduce((total, child) => total + measureSpan(child), 0);
    return node.span;
  };
  measureSpan(rootId);
  let cursor = 0;
  const place = (id: string, parent: MindDraft | null, side: 'left' | 'right'): void => {
    const node = nodes.get(id)!;
    const gap = parent === null ? 0 : parent.depth === 0 ? ROOT_GAP : BRANCH_GAP;
    node.side = side;
    node.point = { x: parent === null ? 0 : parent.point.x + (side === 'right' ? gap : -gap), y: 0 };
    if (node.children.length === 0) {
      node.point.y = cursor + node.size.height / 2;
      cursor += node.size.height + VERTICAL_GAP;
      return;
    }
    for (const [index, childId] of node.children.entries()) {
      // The root splits its branches left/right; deeper branches follow their side.
      const childSide = parent === null ? (index < Math.ceil(node.children.length / 2) ? 'right' : 'left') : side;
      place(childId, node, childSide);
    }
    const first = nodes.get(node.children[0]!)!;
    const last = nodes.get(node.children.at(-1)!)!;
    node.point.y = (first.point.y + last.point.y) / 2;
  };
  place(rootId, null, 'right');
}

function materialize(rootId: string | null, nodes: Map<string, MindDraft>, context: FamilyContext): FamilyScene {
  if (!rootId) return { nodes: [], connectors: [], size: { width: 360, height: 240 } };
  layoutTree(nodes, rootId);
  const rootY = nodes.get(rootId)!.point.y;
  const sceneNodes: SceneNode[] = [];
  const connectors: SceneConnector[] = [];
  // Cascade branch colours top-down so a `[green]` branch tints everything under it.
  const cascade = (id: string, inherited: string | undefined): void => {
    const node = nodes.get(id)!;
    const own = node.color;
    const effective = !own ? inherited : own;
    for (const childId of node.children) {
      const child = nodes.get(childId)!;
      if (!child.color && effective) child.color = effective;
      cascade(childId, effective);
    }
  };
  cascade(rootId, undefined);

  for (const node of nodes.values()) {
    const palette = node.color && !isHexColor(node.color) ? COLOR_WORDS[node.color]?.key : undefined;
    const custom = node.color && isHexColor(node.color) ? node.color : undefined;
    sceneNodes.push({
      id: node.id, kind: 'mindmap', parentId: null, layerId: 'default', zIndex: 1,
      transform: { translation: { x: node.point.x - node.size.width / 2, y: node.point.y - rootY - node.size.height / 2 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: node.size,
      content: {
        label: node.label,
        mindmapDepth: node.depth,
        ...(node.parentId ? { mindmapParentId: node.parentId } : {}),
        ...(node.wrapper ? { mindmapWrapper: node.wrapper } : {}),
        mindmapSide: node.side,
        ...(custom ? { color: 'custom', customColor: custom } : palette ? { color: palette } : node.depth === 0 ? { color: 'slate' } : {}),
        ...(node.depth === 0 || node.fill ? { colorMode: 'filled' } : {}),
      },
      appearance: {}, ports: [],
      metadata: {
        dsl: {
          id: node.id, line: node.line, mindmap: true,
          ...(node.wrapper ? { mindmapWrapper: node.wrapper } : {}),
          ...(node.color ? { mindmapColor: node.color } : {}),
          ...(node.attrs.length ? { attrs: attrsToJson(node.attrs) } : {}),
          ...(node.comments.length ? { comments: node.comments } : {}),
        },
      },
      extensions: {},
    });
    for (const childId of node.children) {
      connectors.push({
        id: `mm:${node.id}->${childId}`,
        source: { nodeId: node.id, portId: null, anchor: null, point: null },
        target: { nodeId: childId, portId: null, anchor: null, point: null },
        route: { kind: 'bezier', ownership: 'imported-fixed' }, waypoints: [], labels: [],
        appearance: {}, semantics: {}, metadata: { dsl: { line: nodes.get(childId)!.line, mindmapEdge: true } },
        extensions: {},
      });
    }
  }

  const left = Math.min(0, ...sceneNodes.map((node) => node.transform.translation.x));
  const top = Math.min(0, ...sceneNodes.map((node) => node.transform.translation.y));
  const shifted = sceneNodes.map((node) => ({
    ...node,
    transform: {
      ...node.transform,
      translation: { x: node.transform.translation.x - left + PADDING.left, y: node.transform.translation.y - top + PADDING.top },
    },
  }));
  void context;
  const width = Math.max(360, ...shifted.map((node) => node.transform.translation.x + node.size.width)) + PADDING.right;
  const height = Math.max(240, ...shifted.map((node) => node.transform.translation.y + node.size.height)) + PADDING.bottom;
  return { nodes: shifted, connectors, size: { width, height } };
}

function mindmapText(scene: DslFrameScene): string[] {
  const raw = dslFrameRaw(scene.frame);
  const nodes = scene.nodes.filter((node) => node.kind === 'mindmap');
  const root = nodes.find((node) => node.content.mindmapDepth === 0) ?? nodes[0];
  if (!root) return [];
  const lineOf = (node: SceneNode) => dslNodeMeta(node).line;
  const childrenOf = (id: string) => nodes.filter((node) => node.content.mindmapParentId === id).sort((a, b) => lineOf(a) - lineOf(b));
  const colorWord = (node: SceneNode): string | undefined => {
    if (typeof node.content.customColor === 'string') return node.content.customColor.toLowerCase();
    const color = node.content.color;
    if (typeof color !== 'string' || color === 'slate') return undefined;
    return Object.keys(COLOR_WORDS).find((candidate) => COLOR_WORDS[candidate]!.key === color);
  };
  const lines: string[] = [...commentLines(dslNodeMeta(root).comments, ''), `central: ${quote(String(root.content.label ?? ''))}`];
  const walk = (node: SceneNode, depth: number, inherited: string | undefined) => {
    const parentWord = colorWord(node) ?? inherited;
    for (const child of childrenOf(node.id)) {
      const meta = dslNodeMeta(child);
      const attrs: CanonicalAttribute[] = [];
      const wrapper = typeof child.content.mindmapWrapper === 'string' ? child.content.mindmapWrapper : undefined;
      const shape = wrapper ? SHAPES_BY_WRAPPER[wrapper] : undefined;
      if (shape) attrs.push({ value: shape });
      const word = colorWord(child);
      if (word && word !== parentWord) attrs.push({ value: word });
      if (child.content.colorMode === 'filled' && child.content.mindmapDepth !== 0) attrs.push({ value: 'bold' });
      const kept = (child.metadata.dsl as { attrs?: CanonicalAttribute[] }).attrs;
      if (Array.isArray(kept)) attrs.push(...kept);
      // Canonical: depth-1 bullets sit at column 0 (grammar §8.7).
      const indent = ' '.repeat(Math.max(0, (depth - 1) * 2));
      lines.push(...commentLines(meta.comments, indent), `${indent}- ${quote(String(child.content.label ?? ''))}${attributeText(sortAttributes(attrs))}`);
      walk(child, depth + 1, word ?? parentWord);
    }
  };
  walk(root, 1, undefined);
  const reserved = Array.isArray(raw.reserved) ? raw.reserved.filter((item): item is string => typeof item === 'string') : [];
  lines.push(...reserved);
  return lines;
}

export const mindmapFamily: Family = {
  name: 'mindmap',
  async compile(segments, context) {
    const { rootId, nodes } = parseMindmap(segments, context);
    return materialize(rootId, nodes, context);
  },
  serialize: mindmapText,
};
