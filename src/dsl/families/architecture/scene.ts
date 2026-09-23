import type { SceneConnector, SceneNode } from '../../../opencanvas/domain/document/types';
import { createArchIndex } from '../../model/model';
import { boundaryIds, projectRelations, selectViewElements } from '../../model/predicates';
import type { ArchElement, ArchModel, ArchRelation, ArchView } from '../../model/types';
import { attrsToJson } from '../../sceneMeta';
import { ACTOR_CONTENT_LAYOUT, measureGroupSize, measureNodeSize } from '../../sizing';
import { COLOR_WORDS, nodeAppearance, SHAPE_WORDS, type DslShapeSpec } from '../../vocabulary';
import type { LayoutNodeInput } from '../../layout';
import { AUTO_ICON_SHAPES } from '../../autoIcon';
import type { FamilyContext, FamilyScene } from '../types';
import type { SwatchResolver } from '../../../opencanvas/domain/nodes/nodePalette';

/**
 * A view + model → scene. Boundaries are containers whose shown children live
 * inside them; every relation projects onto the nearest shown ancestor, so a
 * context view shows `Customer -> Shop` even when the model says
 * `Customer -> Shop.Web`. Geometry comes from the injected layout port.
 */

const FRAME_PADDING = { top: 28, right: 28, bottom: 28, left: 28 };
const FRAME_TITLE_PADDING = { top: 72, right: 28, bottom: 28, left: 28 };
const GROUP_PADDING = { top: 54, right: 22, bottom: 22, left: 22 };

/** Shape vocabulary per element kind; the tasteful default C4 look. */
const KIND_SHAPE: Readonly<Record<string, string>> = {
  person: 'person', system: 'rect', external: 'rect', container: 'rounded',
  component: 'component', store: 'cylinder', queue: 'queue', node: 'rounded', instance: 'rounded',
};

/** Default pastel colour per kind; an authored `[color: …]` wins. */
const KIND_COLOR: Readonly<Record<string, string>> = {
  system: 'blue', external: 'gray', person: 'violet', instance: 'gray',
};

function elementShapeWord(element: ArchElement): string {
  const authored = element.attrs?.find((entry) => !entry.key && SHAPE_WORDS[entry.value]);
  return authored?.value ?? KIND_SHAPE[element.kind] ?? 'rounded';
}

function elementColorWord(element: ArchElement): string | undefined {
  return element.color ?? KIND_COLOR[element.kind];
}

function paletteKey(word: string): string {
  return COLOR_WORDS[word.toLowerCase()]?.key ?? word;
}

function specFor(word: string): DslShapeSpec {
  return SHAPE_WORDS[word] ?? SHAPE_WORDS.rounded!;
}

export async function compileArchitectureView(
  model: ArchModel,
  view: ArchView,
  context: FamilyContext,
): Promise<FamilyScene> {
  const index = createArchIndex(model);
  const selection = selectViewElements(index, view);
  const boundaries = boundaryIds(index, selection.shown);
  const projected = projectRelations(index, selection.shown);

  const shownParent = (elementId: string): string | null => {
    const element = index.byId.get(elementId);
    for (let parent = element?.parent ?? null; parent; parent = index.byId.get(parent)?.parent ?? null) {
      if (boundaries.has(parent)) return parent;
    }
    return null;
  };

  const boundaryNodes: SceneNode[] = [];
  const sceneNodes: SceneNode[] = [];
  let zIndex = 1;
  for (const element of index.model.elements) {
    if (!selection.shown.has(element.id)) continue;
    const parentId = shownParent(element.id);
    if (boundaries.has(element.id)) {
      boundaryNodes.push(boundaryNode(element, parentId, zIndex++, context));
      continue;
    }
    sceneNodes.push(elementNode(element, parentId, zIndex++, context));
  }

  const connectors: SceneConnector[] = projected.map((projection) =>
    relationConnector(projection.relation, projection.from, projection.to, projection.implied));

  const layoutNodes: LayoutNodeInput[] = [
    ...boundaryNodes.map((node) => ({
      id: node.id, parentId: node.parentId, size: node.size,
      minSize: measureGroupSize(String(node.content.label ?? ''), false),
    } satisfies LayoutNodeInput)),
    ...sceneNodes.map((node) => ({ id: node.id, parentId: node.parentId, size: node.size } satisfies LayoutNodeInput)),
  ];
  const laid = await context.layout({
    nodes: layoutNodes,
    edges: connectors.map((connector) => ({ id: connector.id, sourceId: connector.source.nodeId!, targetId: connector.target.nodeId! })),
    direction: view.direction ?? context.direction,
    rootPadding: context.title ? FRAME_TITLE_PADDING : FRAME_PADDING,
    groupPadding: GROUP_PADDING,
  }, context.signal);

  const position = (node: SceneNode): SceneNode => ({
    ...node,
    ...(laid.sizes[node.id] ? { size: laid.sizes[node.id]! } : {}),
    transform: { ...node.transform, translation: laid.positions[node.id] ?? { x: 0, y: 0 } },
  });

  return {
    nodes: [...boundaryNodes, ...sceneNodes].map(position),
    connectors,
    size: laid.root.width > 0 && laid.root.height > 0 ? laid.root : { width: 640, height: 420 },
    meta: {
      arch: { model: model as unknown as Record<string, unknown>, view: view.id },
      ...(selection.unsupported.length ? { archUnsupported: selection.unsupported.map((rule) => rule.raw ?? '') } : {}),
    },
  };
}

function boundaryNode(element: ArchElement, parentId: string | null, zIndex: number, context: FamilyContext): SceneNode {
  const color = elementColorWord(element);
  return {
    id: element.id, kind: 'frame', parentId, layerId: 'default', zIndex,
    transform: { translation: { ...context.origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 240, height: 160 },
    content: { label: element.name, ...(color ? { color: paletteKey(color) } : {}) },
    appearance: {}, ports: [],
    metadata: {
      model: {
        elementId: element.id,
        ...(element.tags.length ? { tags: element.tags } : {}),
        ...(element.desc ? { desc: element.desc } : {}),
      },
    },
    extensions: {},
  };
}

type ElementContext = Pick<FamilyContext, 'origin' | 'swatch' | 'resolveIcon' | 'inferIcon' | 'measureLabel'>;

/**
 * How an element draws with no icon — the node a compile gives it under
 * `icon: none`. Canvas edits that take an icon off use it, so the card turns
 * back into exactly the shape the text would produce.
 */
export function plainElementNode(element: ArchElement, swatch: SwatchResolver): SceneNode {
  return elementNode({ ...element, icon: 'none' }, null, 0, { origin: { x: 0, y: 0 }, swatch });
}

function elementNode(element: ArchElement, parentId: string | null, zIndex: number, context: ElementContext): SceneNode {
  const shapeWord = elementShapeWord(element);
  const spec = specFor(shapeWord);
  // `icon: none` opts out; a person or a boundary keeps its C4 shape.
  const autoIcon = !element.icon && context.inferIcon && AUTO_ICON_SHAPES.has(shapeWord)
    ? context.inferIcon(element.name, element.tech) ?? undefined
    : undefined;
  const authoredIcon = element.icon === 'none' ? undefined : element.icon ?? autoIcon;
  const resolvedIcon = authoredIcon && context.resolveIcon ? context.resolveIcon(authoredIcon) : null;
  const isIconCard = Boolean(authoredIcon && (!context.resolveIcon || resolvedIcon));
  const label = element.name;
  const subLabel = element.tech;
  const kind = isIconCard ? 'architecture' : spec.kind;
  const size = context.measureLabel
    ? context.measureLabel(label, kind)
    : measureNodeSize({
      kind, label, ...(subLabel ? { subLabel } : {}), hasIcon: isIconCard, spec,
    });
  const color = elementColorWord(element);
  const fill = element.attrs?.some((entry) => entry.value === 'bold') ? 'bold' as const
    : element.attrs?.some((entry) => entry.value === 'outline') ? 'outline' as const : 'pastel' as const;
  const sticky = kind === 'sticky';
  return {
    id: element.id, kind, parentId, layerId: 'default', zIndex,
    transform: { translation: { ...context.origin }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size,
    content: {
      label,
      ...(!isIconCard && !sticky && spec.shape ? { shape: spec.shape } : {}),
      ...(spec.shape === 'actor' ? { contentLayout: ACTOR_CONTENT_LAYOUT } : {}),
      ...(subLabel ? { subLabel } : {}),
      // Architecture cards and containers resolve their palette from content keys.
      ...(isIconCard && color ? { color: paletteKey(color), ...(fill === 'bold' ? { colorMode: 'filled' } : {}) } : {}),
      ...(isIconCard && authoredIcon ? {
        icon: authoredIcon,
        archProvider: iconProvider(authoredIcon), archResourceType: iconResource(authoredIcon),
        ...(resolvedIcon ? { archIconPackId: resolvedIcon.packId, archIconShapeId: resolvedIcon.shapeId } : {}),
        assetPresentation: 'icon',
      } : {}),
    },
    appearance: isIconCard || sticky
      ? {}
      : {
        ...nodeAppearance(color, fill, false, context.swatch),
        ...(spec.shape === 'actor' ? { textVerticalAlign: 'bottom', textPadding: 10 } : {}),
      },
    ports: [],
    metadata: {
      model: {
        elementId: element.id,
        ...(element.tags.length ? { tags: element.tags } : {}),
        ...(element.desc ? { desc: element.desc } : {}),
        ...(element.links.length ? { links: element.links } : {}),
        ...(element.instanceOf ? { instanceOf: element.instanceOf } : {}),
      },
      ...(element.attrs?.length || autoIcon ? {
        dsl: { ...(element.attrs?.length ? { attrs: attrsToJson(element.attrs) } : {}), ...(autoIcon ? { autoIcon } : {}) },
      } : {}),
    },
    extensions: {},
  };
}

/**
 * The connector a relation becomes on a view, between the shown endpoints
 * (`from`/`to` may be ancestors of the relation's own ends). The model-aware
 * commands reuse it so a relation drawn later looks exactly like a compiled one.
 */
export function relationConnector(relation: ArchRelation, from: string, to: string, implied: boolean): SceneConnector {
  const label = relationLabel(relation.label, relation.tech);
  const id = `rel:${from}->${to}`;
  return {
    id,
    source: endpoint(from), target: endpoint(to),
    route: { kind: 'orthogonal', ownership: 'automatic' }, waypoints: [],
    labels: label ? [{ id: `${id}:label`, text: label, pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }] : [],
    appearance: implied ? { dashPattern: 'dashed' } : {},
    semantics: {},
    metadata: {
      model: { relationId: relation.id, ...(implied ? { implied: true } : {}), ...(relation.tags.length ? { tags: relation.tags } : {}) },
      ...(relation.line !== undefined ? { dsl: { line: relation.line } } : {}),
    },
    extensions: {},
  };
}

function relationLabel(label: string | undefined, tech: string | undefined): string | undefined {
  if (label && tech) return `${label} [${tech}]`;
  if (label) return label;
  if (tech) return `[${tech}]`;
  return undefined;
}

function endpoint(nodeId: string): SceneConnector['source'] {
  return { nodeId, portId: null, anchor: null, point: null };
}

function iconProvider(icon: string): string {
  const [provider] = icon.split(/[/:-]/);
  return provider || 'custom';
}

function iconResource(icon: string): string {
  const [, ...rest] = icon.split(/[/:-]/);
  return rest.join('-') || icon;
}
