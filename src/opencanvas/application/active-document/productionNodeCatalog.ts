import type { Point2d, Size2d } from '../../domain/geometry/types';
import type { JsonObject } from '../../domain/document/json';
import type { SceneNode } from '../../domain/document/types';

export type ProductionNodeGroup =
  | 'basic'
  | 'freeform'
  | 'architecture'
  | 'container'
  | 'structured'
  | 'sequence'
  | 'wireframe';

export interface ProductionNodeCatalogEntry {
  /** Catalog identifier. Usually the scene kind, but a family can expose more
   *  than one insertable entry for the same kind (provider icons, fragments). */
  readonly id: string;
  readonly group: ProductionNodeGroup;
  readonly label: string;
  readonly kind: string;
  readonly size: Size2d;
  readonly content: JsonObject;
  /** Content key that must carry the new node's own id, for kinds identified by
   *  a self-reference rather than by `kind` alone. */
  readonly idContentKey?: string;
}

const STROKE_SIZE: Size2d = { width: 180, height: 80 };
const NOTE_SIZE: Size2d = { width: 180, height: 120 };

function strokePoints(kind: string): readonly JsonObject[] {
  return kind === 'pen' || kind === 'highlighter'
    ? [{ x: 0, y: 50 }, { x: 35, y: 20 }, { x: 70, y: 60 }, { x: 110, y: 25 }, { x: 180, y: 45 }]
    : [{ x: 0, y: 40 }, { x: 180, y: 40 }];
}

function strokeEntry(
  kind: 'pen' | 'highlighter' | 'line' | 'arrow',
  label: string
): ProductionNodeCatalogEntry {
  return {
    id: kind,
    group: 'freeform',
    label,
    kind,
    size: STROKE_SIZE,
    content: {
      points: strokePoints(kind),
      strokeColor: kind === 'highlighter' ? '#fde047' : '#334155',
      strokeWidth: kind === 'highlighter' ? 16 : 3,
      transparency: kind === 'highlighter' ? 0.45 : 1,
    },
  };
}

// Shape and colour are deliberately left unset: `resolveBasicNodePresentation`
// already defaults them per kind, so restating them here would fork the source
// of truth for what a `start` node looks like.
function basicEntry(
  kind: 'process' | 'start' | 'decision' | 'end' | 'custom',
  label: string,
  size: Size2d
): ProductionNodeCatalogEntry {
  return { id: kind, group: 'basic', label, kind, size, content: { label } };
}

export const PRODUCTION_NODE_CATALOG: readonly ProductionNodeCatalogEntry[] = [
  basicEntry('process', 'Process', { width: 168, height: 72 }),
  basicEntry('start', 'Start', { width: 140, height: 56 }),
  basicEntry('decision', 'Decision', { width: 160, height: 100 }),
  basicEntry('end', 'End', { width: 140, height: 56 }),
  basicEntry('custom', 'Custom', { width: 168, height: 72 }),
  {
    id: 'text', group: 'freeform', label: 'Text', kind: 'text',
    size: { width: 180, height: 44 }, content: { label: 'Text' },
  },
  {
    id: 'image', group: 'freeform', label: 'Image', kind: 'image',
    size: { width: 220, height: 160 }, content: { label: 'Image' },
  },
  {
    id: 'annotation', group: 'freeform', label: 'Annotation', kind: 'annotation',
    size: NOTE_SIZE, content: { label: 'Annotation', subLabel: 'Add a note…' },
  },
  {
    id: 'sticky', group: 'freeform', label: 'Sticky note', kind: 'sticky',
    size: NOTE_SIZE, content: { label: 'Sticky note', subLabel: 'Add a note…' },
  },
  {
    id: 'callout', group: 'freeform', label: 'Callout', kind: 'callout',
    size: NOTE_SIZE, content: { label: 'Callout', subLabel: 'Add a note…' },
  },
  strokeEntry('pen', 'Pen stroke'),
  strokeEntry('highlighter', 'Highlighter stroke'),
  strokeEntry('line', 'Line'),
  strokeEntry('arrow', 'Arrow'),
  {
    id: 'architecture', group: 'architecture', label: 'Architecture card', kind: 'architecture',
    size: { width: 220, height: 96 },
    content: { label: 'Architecture Node', archProvider: 'custom', archResourceType: 'service' },
  },
  {
    id: 'provider_icon', group: 'architecture', label: 'Provider icon', kind: 'architecture',
    size: { width: 88, height: 88 },
    content: { assetPresentation: 'icon', archProvider: 'custom', archResourceType: 'service' },
  },
  {
    id: 'group', group: 'container', label: 'Group', kind: 'group',
    size: { width: 320, height: 220 }, content: { label: 'Group' },
  },
  {
    id: 'section', group: 'container', label: 'Section', kind: 'section',
    size: { width: 480, height: 320 }, content: { label: 'Section' },
  },
  {
    id: 'swimlane', group: 'container', label: 'Swimlane', kind: 'swimlane',
    size: { width: 640, height: 200 }, content: { label: 'Swimlane' },
  },
  {
    id: 'class', group: 'structured', label: 'Class', kind: 'class',
    size: { width: 240, height: 180 }, content: { label: 'Class' },
  },
  {
    id: 'er_entity', group: 'structured', label: 'ER entity', kind: 'er_entity',
    size: { width: 240, height: 180 }, content: { label: 'Entity' },
  },
  {
    id: 'mindmap', group: 'structured', label: 'Mindmap topic', kind: 'mindmap',
    size: { width: 200, height: 64 }, content: { label: 'Central Topic', mindmapDepth: 0 },
  },
  {
    id: 'journey', group: 'structured', label: 'Journey step', kind: 'journey',
    size: { width: 220, height: 120 },
    content: {
      label: 'Journey Step', journeyTitle: 'Journey', journeySection: 'General',
      journeyTask: 'Journey Step', journeyActor: 'Actor',
    },
  },
  {
    id: 'sequence_participant', group: 'sequence', label: 'Participant',
    kind: 'sequence_participant', size: { width: 168, height: 64 },
    content: { label: 'Participant' },
  },
  {
    id: 'sequence_note', group: 'sequence', label: 'Sequence note', kind: 'sequence_note',
    size: { width: 200, height: 90 }, content: { label: 'Note', seqNotePosition: 'over' },
  },
  {
    id: 'sequence_fragment', group: 'sequence', label: 'Sequence fragment', kind: 'annotation',
    size: { width: 360, height: 220 },
    content: { label: 'FRAGMENT', subLabel: 'condition' },
    idContentKey: 'seqFragmentId',
  },
  {
    id: 'browser', group: 'wireframe', label: 'Browser frame', kind: 'browser',
    size: { width: 420, height: 300 }, content: { label: 'Page' },
  },
  {
    id: 'mobile', group: 'wireframe', label: 'Mobile frame', kind: 'mobile',
    size: { width: 260, height: 440 }, content: { label: 'Screen' },
  },
];

const CATALOG_BY_ID = new Map(PRODUCTION_NODE_CATALOG.map((entry) => [entry.id, entry]));

export function productionNodeCatalogEntry(id: string): ProductionNodeCatalogEntry | null {
  return CATALOG_BY_ID.get(id) ?? null;
}

/**
 * Single factory every OpenCanvas insertion path routes through, so a newly
 * created node's shape is decided in exactly one place.
 */
export function createProductionSceneNode(
  catalogId: string,
  id: string,
  point: Point2d,
  layerId: string,
  content: JsonObject = {}
): SceneNode {
  if (!id) throw new TypeError('Node id must not be empty.');
  const entry = CATALOG_BY_ID.get(catalogId);
  if (!entry) throw new RangeError(`OpenCanvas node catalog entry "${catalogId}" was not found.`);
  return {
    id,
    kind: entry.kind,
    parentId: null,
    layerId,
    zIndex: 0,
    transform: { translation: point, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: entry.size,
    content: {
      ...entry.content,
      ...(entry.idContentKey ? { [entry.idContentKey]: id } : {}),
      ...content,
    },
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
  };
}
