import { useCallback, useState } from 'react';
import type { V2WorkspaceMode } from './V2Workspace';

// Below this width the left and right slots cannot both be open beside the canvas.
const NARROW_PX = 1100;
const narrow = () => window.innerWidth < NARROW_PX;

/**
 * Which panel holds each slot. Right: one workspace panel, the shortcuts sheet,
 * a chart's data panel or the animation export. Left: the layers tree. Opening
 * one closes whatever shared its slot; on a narrow window, the other slot too.
 */
export function useV2Panels() {
  const [workspace, setWorkspace] = useState<V2WorkspaceMode | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Pinned to one chart: a plain select never opens it, and it stays while you click around.
  const [chartId, setChartId] = useState<string | null>(null);
  // Animation export docks right, under the Export button that opens it: one right-side panel at a time.
  const [motionOpen, setMotionOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);

  const openWorkspace = useCallback((mode: V2WorkspaceMode) => {
    setWorkspace(mode);
    setShortcutsOpen(false);
    setChartId(null);
    setMotionOpen(false);
    if (narrow()) setTreeOpen(false);
  }, []);
  const toggleWorkspace = useCallback((mode: V2WorkspaceMode) => {
    if (workspace === mode) setWorkspace(null); else openWorkspace(mode);
  }, [workspace, openWorkspace]);
  const closeWorkspace = useCallback(() => setWorkspace(null), []);
  const openChart = useCallback((nodeId: string) => {
    setChartId(nodeId);
    setWorkspace(null);
    setShortcutsOpen(false);
    setMotionOpen(false);
  }, []);
  const closeChart = useCallback(() => setChartId(null), []);
  const openMotion = useCallback(() => {
    setWorkspace(null);
    setShortcutsOpen(false);
    setChartId(null);
    if (narrow()) setTreeOpen(false);
    setMotionOpen(true);
  }, []);
  const closeMotion = useCallback(() => setMotionOpen(false), []);
  const toggleTree = useCallback(() => {
    setTreeOpen((open) => !open);
    if (narrow()) { setWorkspace(null); setShortcutsOpen(false); setMotionOpen(false); }
  }, []);
  const closeTree = useCallback(() => setTreeOpen(false), []);
  const toggleShortcuts = useCallback(() => {
    setShortcutsOpen((open) => !open);
    setWorkspace(null);
    setChartId(null);
    setMotionOpen(false);
    if (narrow()) setTreeOpen(false);
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);
  /** The tail of the Escape chain once nothing is selected. */
  const closeDocked = useCallback(() => {
    setWorkspace(null);
    setShortcutsOpen(false);
    setTreeOpen(false);
  }, []);

  return {
    workspace, shortcutsOpen, chartId, motionOpen, treeOpen,
    openWorkspace, toggleWorkspace, closeWorkspace, setWorkspace,
    openChart, closeChart, openMotion, closeMotion,
    toggleTree, closeTree, toggleShortcuts, closeShortcuts, closeDocked,
  };
}

export type V2Panels = ReturnType<typeof useV2Panels>;
