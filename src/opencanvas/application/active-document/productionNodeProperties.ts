import { areStructurallyEqual } from '../../domain/commands/equality';
import type { SetNodeCommand } from '../../domain/commands/types';
import type { JsonValue } from '../../domain/document/json';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { validateCustomSvgPath } from '../../domain/nodes/customSvgPath';

export type NodePropertyField =
  | { readonly key: string; readonly label: string; readonly type: 'text' | 'multiline' | 'json' }
  | { readonly key: string; readonly label: string; readonly type: 'number'; readonly min: number; readonly max: number }
  | { readonly key: string; readonly label: string; readonly type: 'boolean' }
  | { readonly key: string; readonly label: string; readonly type: 'select'; readonly options: readonly string[] };

const COMMON_FIELDS: readonly NodePropertyField[] = [
  { key: 'subLabel', label: 'Subtitle', type: 'text' },
  { key: 'color', label: 'Color token', type: 'text' },
  { key: 'colorMode', label: 'Color mode', type: 'select', options: ['subtle', 'filled'] },
  { key: 'pinned', label: 'Pinned for layout', type: 'boolean' },
];

const BUILT_IN_SHAPES = [
  'rectangle', 'rounded', 'capsule', 'circle', 'ellipse', 'diamond', 'hexagon',
  'parallelogram', 'cylinder', 'cloud', 'document', 'queue', 'database', 'actor',
  'custom-path',
] as const;

const BASIC_SHAPE_FIELDS: readonly NodePropertyField[] = [
  { key: 'shape', label: 'Shape', type: 'select', options: BUILT_IN_SHAPES },
  { key: 'customSvgPath', label: 'Custom SVG path', type: 'text' },
];

const FAMILY_FIELDS: Readonly<Record<string, readonly NodePropertyField[]>> = {
  process: BASIC_SHAPE_FIELDS,
  start: BASIC_SHAPE_FIELDS,
  decision: BASIC_SHAPE_FIELDS,
  end: BASIC_SHAPE_FIELDS,
  custom: BASIC_SHAPE_FIELDS,
  text: [
    { key: 'fontSize', label: 'Font size', type: 'number', min: 8, max: 160 },
    { key: 'fontWeight', label: 'Font weight', type: 'select', options: ['400', '500', '600', '700'] },
  ],
  image: [
    { key: 'imageUrl', label: 'Image URL', type: 'text' },
    { key: 'transparency', label: 'Opacity', type: 'number', min: 0, max: 1 },
  ],
  annotation: [{ key: 'subLabel', label: 'Body', type: 'multiline' }],
  sticky: [{ key: 'subLabel', label: 'Body', type: 'multiline' }],
  callout: [{ key: 'subLabel', label: 'Body', type: 'multiline' }],
  pen: [
    { key: 'strokeColor', label: 'Stroke color', type: 'text' },
    { key: 'strokeWidth', label: 'Stroke width', type: 'number', min: 0.5, max: 64 },
  ],
  highlighter: [
    { key: 'strokeColor', label: 'Stroke color', type: 'text' },
    { key: 'strokeWidth', label: 'Stroke width', type: 'number', min: 0.5, max: 64 },
    { key: 'transparency', label: 'Opacity', type: 'number', min: 0, max: 0.5 },
  ],
  line: [
    { key: 'strokeColor', label: 'Stroke color', type: 'text' },
    { key: 'strokeWidth', label: 'Stroke width', type: 'number', min: 0.5, max: 64 },
  ],
  arrow: [
    { key: 'strokeColor', label: 'Stroke color', type: 'text' },
    { key: 'strokeWidth', label: 'Stroke width', type: 'number', min: 0.5, max: 64 },
  ],
  architecture: [
    { key: 'archProvider', label: 'Provider', type: 'text' },
    { key: 'archResourceType', label: 'Resource type', type: 'text' },
    { key: 'archEnvironment', label: 'Environment', type: 'text' },
    { key: 'archZone', label: 'Zone', type: 'text' },
  ],
  group: [{ key: 'sectionCollapsed', label: 'Collapsed', type: 'boolean' }],
  section: [
    { key: 'sectionLocked', label: 'Locked', type: 'boolean' },
    { key: 'sectionCollapsed', label: 'Collapsed', type: 'boolean' },
  ],
  swimlane: [{ key: 'sectionCollapsed', label: 'Collapsed', type: 'boolean' }],
  class: [
    { key: 'classStereotype', label: 'Stereotype', type: 'text' },
    { key: 'classAttributes', label: 'Attributes', type: 'multiline' },
    { key: 'classMethods', label: 'Methods', type: 'multiline' },
  ],
  er_entity: [{ key: 'erFields', label: 'Fields JSON', type: 'json' }],
  mindmap: [
    { key: 'mindmapAlias', label: 'Alias', type: 'text' },
    { key: 'mindmapSide', label: 'Side', type: 'select', options: ['left', 'right'] },
    { key: 'mindmapCollapsed', label: 'Collapsed', type: 'boolean' },
  ],
  journey: [
    { key: 'journeyTitle', label: 'Journey title', type: 'text' },
    { key: 'journeySection', label: 'Section', type: 'text' },
    { key: 'journeyTask', label: 'Task', type: 'text' },
    { key: 'journeyActor', label: 'Actor', type: 'text' },
    { key: 'journeyScore', label: 'Score', type: 'number', min: 1, max: 5 },
  ],
  sequence_participant: [
    { key: 'seqParticipantAlias', label: 'Alias', type: 'text' },
    { key: 'seqParticipantKind', label: 'Participant kind', type: 'select', options: ['participant', 'actor'] },
  ],
  sequence_note: [
    { key: 'seqNotePosition', label: 'Note position', type: 'select', options: ['left', 'right', 'over'] },
    { key: 'seqMessageOrder', label: 'Message order', type: 'number', min: 0, max: 10_000 },
  ],
  sequence_fragment: [{ key: 'subLabel', label: 'Condition', type: 'text' }],
  browser: [{ key: 'variant', label: 'Variant', type: 'text' }],
  mobile: [{ key: 'variant', label: 'Variant', type: 'text' }],
};

export function nodePropertyFields(node: SceneNode): readonly NodePropertyField[] {
  const specific = FAMILY_FIELDS[node.kind] ?? [];
  const specificKeys = new Set(specific.map(({ key }) => key));
  return [...COMMON_FIELDS.filter(({ key }) => !specificKeys.has(key)), ...specific];
}

function validateValue(field: NodePropertyField, value: JsonValue | undefined): JsonValue | undefined {
  if (value === undefined || value === '') return undefined;
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new TypeError(`${field.label} must be boolean.`);
    return value;
  }
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${field.label} must be a finite number.`);
    }
    return Math.min(field.max, Math.max(field.min, value));
  }
  if (field.type === 'select') {
    if (typeof value !== 'string' || !field.options.includes(value)) {
      throw new TypeError(`${field.label} has an unsupported value.`);
    }
    return value;
  }
  if (field.type === 'multiline' && Array.isArray(value)) {
    if (!value.every((item) => typeof item === 'string')) {
      throw new TypeError(`${field.label} must contain text lines.`);
    }
    return value;
  }
  if (field.type === 'json') return value;
  if (typeof value !== 'string') throw new TypeError(`${field.label} must be text.`);
  return value.trim();
}

export function buildProductionNodePropertiesCommand(
  page: ScenePage,
  nodeId: string,
  updates: Readonly<Record<string, JsonValue | undefined>>
): SetNodeCommand | null {
  const before = page.nodes.find((node) => node.id === nodeId);
  if (!before) throw new RangeError(`Node "${nodeId}" was not found.`);
  const fields = new Map(nodePropertyFields(before).map((field) => [field.key, field]));
  const content: Record<string, JsonValue> = { ...before.content };
  for (const [key, value] of Object.entries(updates)) {
    const field = fields.get(key);
    if (!field) throw new RangeError(`Property "${key}" is not editable for ${before.kind}.`);
    const validated = validateValue(field, value);
    if (validated === undefined) delete content[key];
    else content[key] = validated;
  }
  if (content.shape === 'custom-path') {
    if (typeof content.customSvgPath !== 'string') throw new TypeError('Custom SVG path is required.');
    content.customSvgPath = validateCustomSvgPath(content.customSvgPath).source;
  }
  const after = { ...before, content };
  if (areStructurallyEqual(before, after)) return null;
  return {
    kind: 'set-node', id: `edit-node-properties:${nodeId}`, label: 'Edit node properties',
    pageId: page.id, before, after,
  };
}
