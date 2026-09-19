import type { Bounds2d, Point2d } from '../geometry/types';
import type { SceneNode } from '../document/types';
import { isClassEntityNodeKind } from './classEntityNodePresentation';

// Shared by the Pixi renderer (drawing) and the surface (row hit-testing).
export const CLASS_ENTITY_HEADER_HEIGHT = 44;
export const CLASS_ENTITY_ROW_HEIGHT = 18;
export const CLASS_ENTITY_CONTENT_PADDING = 10;

export type ClassEntityList = 'classAttributes' | 'classMethods' | 'erFields';

export interface ClassEntityRow {
  readonly list: ClassEntityList;
  /** Index into the list; equal to its length for the empty "add" row. */
  readonly index: number;
  /** Row rectangle in node-local coordinates. */
  readonly bounds: Bounds2d;
}

function listLength(node: SceneNode, list: ClassEntityList): number {
  const value = node.content[list];
  return Array.isArray(value) ? value.length : 0;
}

/** The visible member rows of a class or entity node, top to bottom. */
export function classEntityRows(node: SceneNode): readonly ClassEntityRow[] {
  if (!isClassEntityNodeKind(node.kind)) return [];
  const width = node.size.width - CLASS_ENTITY_CONTENT_PADDING * 2;
  const top = CLASS_ENTITY_HEADER_HEIGHT + CLASS_ENTITY_CONTENT_PADDING;
  const row = (list: ClassEntityList, index: number, y: number): ClassEntityRow => ({
    list, index, bounds: { x: CLASS_ENTITY_CONTENT_PADDING, y, width, height: CLASS_ENTITY_ROW_HEIGHT },
  });
  const usable = node.size.height - CLASS_ENTITY_HEADER_HEIGHT - CLASS_ENTITY_CONTENT_PADDING * 2;
  if (node.kind === 'er_entity') {
    const slots = Math.max(1, Math.floor(usable / CLASS_ENTITY_ROW_HEIGHT));
    const count = Math.min(listLength(node, 'erFields') + 1, slots);
    return Array.from({ length: count }, (_, index) =>
      row('erFields', index, top + index * CLASS_ENTITY_ROW_HEIGHT));
  }
  const availableRows = Math.max(2, Math.floor(usable / CLASS_ENTITY_ROW_HEIGHT));
  const attributeSlots = Math.max(1, Math.ceil(availableRows / 2));
  const methodSlots = Math.max(1, availableRows - attributeSlots);
  const attributes = Math.min(listLength(node, 'classAttributes') + 1, attributeSlots);
  const methods = Math.min(listLength(node, 'classMethods') + 1, methodSlots);
  const methodsTop = top + attributeSlots * CLASS_ENTITY_ROW_HEIGHT + CLASS_ENTITY_ROW_HEIGHT;
  return [
    ...Array.from({ length: attributes }, (_, index) =>
      row('classAttributes', index, top + index * CLASS_ENTITY_ROW_HEIGHT)),
    ...Array.from({ length: methods }, (_, index) =>
      row('classMethods', index, methodsTop + index * CLASS_ENTITY_ROW_HEIGHT)),
  ];
}

// ponytail: node-local point ignores rotation; rotated class nodes fall back
// to the inspector.
export function classEntityRowAt(node: SceneNode, local: Point2d): ClassEntityRow | null {
  return classEntityRows(node).find(({ bounds }) =>
    local.x >= bounds.x && local.x <= bounds.x + bounds.width
    && local.y >= bounds.y && local.y <= bounds.y + bounds.height) ?? null;
}
