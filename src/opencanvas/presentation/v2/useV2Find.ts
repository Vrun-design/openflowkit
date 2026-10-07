import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { replaceSelection, type CanvasSelection } from '../../application/selection/selection';
import type { ScenePage } from '../../domain/document/types';
import type { CanvasCamera } from '../../domain/camera/types';
import { findNodes } from '../../domain/scene/findNodes';

interface V2FindOptions {
  readonly page: ScenePage | null;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorIdsRef: RefObject<readonly string[]>;
  readonly cameraRef: RefObject<CanvasCamera>;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorIds: readonly string[]) => void;
  readonly glideToNodes: (nodeIds: readonly string[]) => void;
  readonly animateTo: (camera: CanvasCamera) => void;
  readonly focusCanvas: () => void;
}

interface Snapshot {
  readonly pageId: string | null;
  readonly selection: CanvasSelection;
  readonly connectorIds: readonly string[];
  readonly camera: CanvasCamera;
}

// ⌘F: stepping through matches moves selection and camera, never the document,
// so there is no history entry. Escape puts both back as they were on open
// (what still exists); the X keeps wherever the search ended.
export function useV2Find(options: V2FindOptions) {
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // The current match is an id, so a delete or reorder cannot leave "2 of 1".
  const [currentId, setCurrentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const matches = useMemo(() => (open && options.page ? findNodes(options.page, query) : []), [open, options.page, query]);
  const index = currentId === null ? -1 : matches.indexOf(currentId);

  const show = useCallback(() => {
    if (snapshotRef.current) { inputRef.current?.focus(); inputRef.current?.select(); return; }
    const { page, selectionRef, selectedConnectorIdsRef, cameraRef } = optionsRef.current;
    snapshotRef.current = {
      pageId: page?.id ?? null, selection: selectionRef.current,
      connectorIds: selectedConnectorIdsRef.current, camera: cameraRef.current,
    };
    setOpen(true);
  }, []);

  const close = useCallback((restore: boolean) => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    setOpen(false);
    setQuery('');
    setCurrentId(null);
    if (snapshot && restore) {
      const { page, applySelection, applyConnectorSelection, animateTo } = optionsRef.current;
      const nodeIds = new Set(page?.nodes.map((node) => node.id));
      const connectorIds = new Set(page?.connectors.map((connector) => connector.id));
      applySelection(replaceSelection(snapshot.selection.nodeIds.filter((id) => nodeIds.has(id))));
      applyConnectorSelection(snapshot.connectorIds.filter((id) => connectorIds.has(id)));
      if (page?.id === snapshot.pageId) animateTo(snapshot.camera);
    }
    optionsRef.current.focusCanvas();
  }, []);

  const search = useCallback((next: string) => { setQuery(next); setCurrentId(null); }, []);

  const step = useCallback((direction: 1 | -1) => {
    if (matches.length === 0) return;
    const next = index < 0 ? (direction > 0 ? 0 : matches.length - 1) : (index + direction + matches.length) % matches.length;
    const { applySelection, applyConnectorSelection, glideToNodes } = optionsRef.current;
    setCurrentId(matches[next]!);
    applyConnectorSelection([]);
    applySelection(replaceSelection([matches[next]!]));
    glideToNodes([matches[next]!]);
  }, [matches, index]);

  const register = useCallback((input: HTMLInputElement | null) => { inputRef.current = input; }, []);

  return { open, query, index, count: matches.length, register, show, close, search, step };
}
