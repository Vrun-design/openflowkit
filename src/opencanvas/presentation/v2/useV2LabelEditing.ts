import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CanvasCamera } from '../../domain/camera/types';
import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { sameRect } from './V2ContextBar';
import { buildDeleteSelectionCommand, buildSetNodeLabelCommand } from '../../domain/commands/sceneEdits';
import type { V2EditingState } from './V2CanvasHost';

interface V2LabelEditingOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly page: ScenePage | null;
  readonly camera: CanvasCamera;
  readonly commit: (command: DocumentCommand) => void;
  readonly announce: (message: string) => void;
  readonly focusCanvas: () => void;
}

export interface OpenEditorOptions {
  /** Node was created for this edit: an empty commit or a cancel removes it again. */
  readonly isNew?: boolean;
  /** Type-to-edit: the editor opens with this text instead of the current label. */
  readonly initialValue?: string;
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
  const pendingRef = useRef<{ nodeId: string; editorOptions: OpenEditorOptions } | null>(null);
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
      const bounds = current && hostRef.current?.getNodeLabelScreenBounds(current.nodeId);
      return bounds && !sameRect(bounds, current.bounds) ? { ...current, bounds } : current;
    });
  }, [camera, hostRef]);

  const openEditor = useCallback(
    (nodeId: string, editorOptions: OpenEditorOptions = {}) => {
      const node = optionsRef.current.page?.nodes.find((candidate) => candidate.id === nodeId);
      // Groups are invisible containers: nothing to label.
      if (node?.kind === 'group') return;
      const bounds = node && hostRef.current?.getNodeLabelScreenBounds(nodeId);
      if (!node || !bounds) {
        pendingRef.current = { nodeId, editorOptions };
        return;
      }
      pendingRef.current = null;
      setEditing({
        nodeId,
        bounds,
        value: editorOptions.initialValue
          ?? (typeof node.content.label === 'string' ? node.content.label : ''),
        isNew: editorOptions.isNew === true,
        caretAtEnd: editorOptions.initialValue !== undefined,
      });
      optionsRef.current.announce('Editing label');
    },
    [hostRef]
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (pending && page?.nodes.some((node) => node.id === pending.nodeId)) {
      openEditor(pending.nodeId, pending.editorOptions);
    }
  }, [page, openEditor]);

  // A node created for this edit and left blank is removed, so a double-click
  // on empty canvas followed by Escape/blur leaves nothing invisible behind.
  const removeIfNew = useCallback((): boolean => {
    const { commit, page: currentPage } = optionsRef.current;
    const current = editingStateRef.current;
    if (!current?.isNew || !currentPage?.nodes.some((node) => node.id === current.nodeId)) return false;
    commit(buildDeleteSelectionCommand(currentPage, [current.nodeId], []));
    return true;
  }, []);

  const cancelEdit = useCallback(() => {
    removeIfNew();
    setEditing(null);
    optionsRef.current.focusCanvas();
  }, [removeIfNew]);

  const commitLabel = useCallback((value: string) => {
    const { commit, announce, focusCanvas, page: currentPage } = optionsRef.current;
    const current = editingStateRef.current;
    const node = current && currentPage?.nodes.find((candidate) => candidate.id === current.nodeId);
    const previous = typeof node?.content.label === 'string' ? node.content.label : '';
    if (value.trim() === '' && removeIfNew()) {
      /* blank new node removed */
    } else if (node && currentPage && value !== previous) {
      commit(buildSetNodeLabelCommand(currentPage, node.id, value));
      announce('Label saved');
    }
    setEditing(null);
    focusCanvas();
  }, [removeIfNew]);

  return { editing, editingRef, openEditor, cancelEdit, commitLabel };
}
