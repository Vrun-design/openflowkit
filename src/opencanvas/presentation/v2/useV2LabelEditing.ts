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
  readonly pageRef: RefObject<ScenePage | null>;
  readonly camera: CanvasCamera;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly focusCanvas: () => void;
}

// In-place label editing owns keyboard input while open (I-02, I-06).
// Escape restores, commit is a single set-node, and focus returns to the
// canvas so F2 and arrows keep working afterwards.
export function useV2LabelEditing(options: V2LabelEditingOptions) {
  const { hostRef, pageRef, camera } = options;
  const [editing, setEditing] = useState<V2EditingState | null>(null);
  const editingRef = useRef(false);
  const editingStateRef = useRef<V2EditingState | null>(null);
  const optionsRef = useRef(options);
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
    (nodeId: string, selectNode: (nodeId: string) => void) => {
      const node = pageRef.current?.nodes.find((candidate) => candidate.id === nodeId);
      const bounds = node && hostRef.current?.getNodeScreenBounds(nodeId);
      if (!node || !bounds) return;
      selectNode(nodeId);
      setEditing({
        nodeId,
        bounds,
        value: typeof node.content.label === 'string' ? node.content.label : '',
      });
    },
    [hostRef, pageRef]
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    optionsRef.current.focusCanvas();
  }, []);

  const commitLabel = useCallback(
    (value: string) => {
      const { commit, announce, focusCanvas } = optionsRef.current;
      const page = pageRef.current;
      const current = editingStateRef.current;
      const node = current && page?.nodes.find((candidate) => candidate.id === current.nodeId);
      const previous = typeof node?.content.label === 'string' ? node.content.label : '';
      if (node && page && value !== previous) {
        commit(buildSetNodeLabelCommand(page, node.id, value));
        announce('Label updated.');
      }
      setEditing(null);
      focusCanvas();
    },
    [pageRef]
  );

  return { editing, editingRef, openEditor, cancelEdit, commitLabel };
}
