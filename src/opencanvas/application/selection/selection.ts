export interface CanvasSelection {
  readonly nodeIds: readonly string[];
  readonly primaryNodeId: string | null;
}

export const EMPTY_CANVAS_SELECTION: CanvasSelection = { nodeIds: [], primaryNodeId: null };

function uniqueIds(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
}

export function replaceSelection(nodeIds: readonly string[]): CanvasSelection {
  const unique = uniqueIds(nodeIds);
  return { nodeIds: unique, primaryNodeId: unique.at(-1) ?? null };
}

export function addToSelection(
  selection: CanvasSelection,
  nodeIds: readonly string[]
): CanvasSelection {
  return replaceSelection([...selection.nodeIds, ...nodeIds]);
}

export function toggleSelection(selection: CanvasSelection, nodeId: string): CanvasSelection {
  if (selection.nodeIds.includes(nodeId)) {
    return replaceSelection(selection.nodeIds.filter((id) => id !== nodeId));
  }
  return addToSelection(selection, [nodeId]);
}

export function clearSelection(): CanvasSelection {
  return EMPTY_CANVAS_SELECTION;
}

export function selectionAnnouncement(selection: CanvasSelection): string {
  const count = selection.nodeIds.length;
  if (count === 0) return 'Canvas selection cleared.';
  return `${count} node${count === 1 ? '' : 's'} selected.`;
}
