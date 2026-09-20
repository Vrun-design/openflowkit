import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CanvasCamera } from '../../domain/camera/types';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { sameRect } from './V2ContextBar';
import { buildSetNodeLabelCommand } from './v2EditCommands';
import type { V2EditingState } from './V2CanvasHost';

interface V2LabelEditingOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly page: ScenePage | null;
  readonly camera: CanvasCamera;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly focusCanvas: () => void;
}

// In-place label editing owns keyboard input while open (I-02, I-06).
// Escape restores, commit is a single set-node, and focus returns to the
// canvas so F2 and arrows keep working afterwards.
export function useV2LabelEditing(options: V2LabelEditingOptions) {
  const { hostRef, page, camera } = options;
  const [editing, setEditing] = useState<V2EditingState | null>(null);
  const editingRef = useRef(false);
  const editingStateRef = useRef<V2EditingState | null>(null);
  const optionsRef = useRef(options);
  // A node created and edited in one gesture is not on the renderer yet;
  // hold the request until the page that contains it has been drawn.
  const pendingRef = useRef<string | null>(null);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    editingRef.current = editing !== null;
    editingStateRef.current = editing;
  }, [editing]);

  // Keep the overlay glued to its node while the camera moves. Depends on the
  // camera alone: depending on state set here would re-run every render and
  // race cancel/commit with a stale re-open.
  useEffect(() => {
    setEditing((current) => {
      const bounds = current && hostRef.current?.getNodeScreenBounds(current.nodeId);
      return bounds && !sameRect(bounds, current.bounds) ? { ...current, bounds } : current;
    });
  }, [camera, hostRef]);

  const openEditor = useCallback(
    (nodeId: string) => {
      const node = optionsRef.current.page?.nodes.find((candidate) => candidate.id === nodeId);
      const bounds = node && hostRef.current?.getNodeScreenBounds(nodeId);
      if (!node || !bounds) {
        pendingRef.current = nodeId;
        return;
      }
      pendingRef.current = null;
      setEditing({
        nodeId,
        bounds,
        value: typeof node.content.label === 'string' ? node.content.label : '',
      });
    },
    [hostRef]
  );

  useEffect(() => {
    if (pendingRef.current && page?.nodes.some((node) => node.id === pendingRef.current)) {
      openEditor(pendingRef.current);
    }
  }, [page, openEditor]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    optionsRef.current.focusCanvas();
  }, []);

  const commitLabel = useCallback((value: string) => {
    const { commit, announce, focusCanvas, page: currentPage } = optionsRef.current;
    const current = editingStateRef.current;
    const node = current && currentPage?.nodes.find((candidate) => candidate.id === current.nodeId);
    const previous = typeof node?.content.label === 'string' ? node.content.label : '';
    if (node && currentPage && value !== previous) {
      commit(buildSetNodeLabelCommand(currentPage, node.id, value));
      announce('Label updated.');
    }
    setEditing(null);
    focusCanvas();
  }, []);

  return { editing, editingRef, openEditor, cancelEdit, commitLabel };
}
