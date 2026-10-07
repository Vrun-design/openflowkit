import type { SceneNode, ScenePage } from '../document/types';
import { buildNodeStateMap } from './nodeState';
import { buildNodeWorldMatrices, nodeWorldBounds } from './worldGeometry';

// Find on canvas: the text a viewer reads on a node. Shapes, stickies, text and
// C4 element names carry it in `label`; `subLabel` is the description under it,
// `title` heads a chart, and the rest are the rows of class, ER, journey and chart nodes.
const TEXT_FIELDS = ['label', 'title', 'journeyTask', 'journeyActor'] as const;
const LIST_FIELDS = ['classAttributes', 'classMethods', 'erFields', 'categories'] as const;

/** Rows are plain strings or, for ER fields, `{ name, dataType }` objects. */
function rowText(row: unknown): string {
  if (typeof row === 'string') return row;
  if (row && typeof row === 'object') {
    const { name, dataType } = row as Record<string, unknown>;
    return [name, dataType].filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
  }
  return '';
}

export function nodeSearchText(node: SceneNode): string {
  const parts: string[] = [];
  for (const field of TEXT_FIELDS) {
    const value = node.content[field];
    if (typeof value === 'string') parts.push(value);
  }
  // A C4 element's sub-label is `[Kind · tech]` over its description: only the description is prose.
  const sub = node.content.subLabel;
  if (typeof sub === 'string') parts.push(node.kind === 'architecture' || node.metadata.model ? sub.replace(/^\[[^\n]*\]\n?/, '') : sub);
  for (const field of LIST_FIELDS) {
    const rows = node.content[field];
    if (Array.isArray(rows)) parts.push(...rows.map(rowText));
  }
  return parts.filter(Boolean).join('\n');
}

/** Ids of the visible nodes whose text contains `query` (case-insensitive), in reading order: top to bottom, then left to right by centre. */
export function findNodes(page: ScenePage, query: string): readonly string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matrices = buildNodeWorldMatrices(page);
  const states = buildNodeStateMap(page);
  return page.nodes
    .filter((node) => states.get(node.id)?.visible && nodeSearchText(node).toLowerCase().includes(needle))
    .map((node) => {
      const { x, y, width, height } = nodeWorldBounds(node, matrices.get(node.id)!);
      return { id: node.id, x: x + width / 2, y: y + height / 2 };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(({ id }) => id);
}
