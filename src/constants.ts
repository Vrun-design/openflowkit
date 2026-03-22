import { MarkerType } from '@/lib/reactflowCompat';
import { type FlowEdge, type FlowNode } from '@/lib/types';
import { createId } from '@/lib/id';

// --- Edge Styles (inline for reliable SVG rendering) ---
export const EDGE_STYLE = { stroke: '#94a3b8', strokeWidth: 2 };
export const EDGE_LABEL_STYLE = { fill: '#334155', fontWeight: 500, fontSize: 12 };
export const EDGE_LABEL_BG_STYLE = { fill: '#ffffff', stroke: '#cbd5e1', strokeWidth: 1 };

/** Shared edge configuration — use `createDefaultEdge()` for most cases. */
export const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep' as const,
  markerEnd: { type: MarkerType.ArrowClosed },
  animated: false,
  style: EDGE_STYLE,
  labelStyle: EDGE_LABEL_STYLE,
  labelBgStyle: EDGE_LABEL_BG_STYLE,
  labelBgPadding: [8, 4] as [number, number],
  labelBgBorderRadius: 4,
};

/** Creates a fully-configured edge with standard OpenFlow styling. */
export const createDefaultEdge = (
  source: string,
  target: string,
  label?: string,
  id?: string
): FlowEdge => ({
  id: id || createId(`e-${source}-${target}`),
  source,
  target,
  label,
  ...DEFAULT_EDGE_OPTIONS,
});

function getMindmapEdgeHandles(sourceNode: FlowNode, targetNode: FlowNode): Pick<FlowEdge, 'sourceHandle' | 'targetHandle'> {
  const targetIsLeftOfSource = targetNode.position.x < sourceNode.position.x;
  return targetIsLeftOfSource
    ? { sourceHandle: 'left', targetHandle: 'right' }
    : { sourceHandle: 'right', targetHandle: 'left' };
}

export function createMindmapEdge(
  sourceNode: FlowNode,
  targetNode: FlowNode,
  label?: string,
  id?: string,
  branchStyle: 'curved' | 'straight' = 'curved'
): FlowEdge {
  return {
    id: id || createId(`e-${sourceNode.id}-${targetNode.id}`),
    source: sourceNode.id,
    target: targetNode.id,
    label,
    ...DEFAULT_EDGE_OPTIONS,
    type: branchStyle === 'straight' ? 'straight' : 'bezier',
    markerEnd: undefined,
    data: {
      mindmapBranchKind: sourceNode.data.mindmapDepth === 0 ? 'root' : 'branch',
    },
    ...getMindmapEdgeHandles(sourceNode, targetNode),
  };
}

export const EDGE_CONDITION_STYLES = {
  default: { stroke: '#94a3b8', strokeWidth: 2 },
  yes: { stroke: '#10b981', strokeWidth: 2 },
  no: { stroke: '#ef4444', strokeWidth: 2 },
  success: { stroke: '#10b981', strokeWidth: 2 },
  error: { stroke: '#ef4444', strokeWidth: 2 },
  timeout: { stroke: '#f59e0b', strokeWidth: 2 },
};

export const EDGE_CONDITION_LABELS = {
  yes: 'Yes',
  no: 'No',
  success: 'Success',
  error: 'Error',
  timeout: 'Timeout',
};

// --- Layout ---
export const NODE_WIDTH = 250;
export const NODE_HEIGHT = 150;

// --- Initial Data ---
export const INITIAL_NODES: FlowNode[] = [];

export const INITIAL_EDGES: FlowEdge[] = [];

// Dash pattern definitions for edge styling
export const EDGE_DASH_PATTERNS: Record<string, { label: string; strokeDasharray: string }> = {
  solid: { label: 'Solid', strokeDasharray: '' },
  dashed: { label: 'Dashed', strokeDasharray: '8 4' },
  dotted: { label: 'Dotted', strokeDasharray: '2 4' },
  dashdot: { label: 'Dash-Dot', strokeDasharray: '8 4 2 4' },
};

// --- Keyboard Shortcuts ---
interface ShortcutDefinition {
  label: string;
  keys: string[];
}

interface ShortcutSection {
  title: string;
  items: ShortcutDefinition[];
}

interface KeyboardShortcutKeyLabels {
  primary: string;
  alternate: string;
  delete: string;
}

export function isMacLikePlatform(platform: string): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function getShortcutKeyLabels(isMacLike: boolean): KeyboardShortcutKeyLabels {
  return {
    primary: isMacLike ? 'Cmd' : 'Ctrl',
    alternate: isMacLike ? 'Opt' : 'Alt',
    delete: isMacLike ? 'Delete' : 'Backspace',
  };
}

export function getKeyboardShortcuts(isMacLike: boolean): ShortcutSection[] {
  const keyLabels = getShortcutKeyLabels(isMacLike);

  return [
    {
      title: 'shortcuts.essentials',
      items: [
        { label: 'common.undo', keys: [keyLabels.primary, 'Z'] },
        { label: 'common.redo', keys: [keyLabels.primary, 'Shift', 'Z'] },
        { label: 'common.selectAll', keys: [keyLabels.primary, 'A'] },
        { label: 'common.delete', keys: [keyLabels.delete] },
      ]
    },
    {
      title: 'shortcuts.manipulation',
      items: [
        { label: 'common.multiSelect', keys: ['Shift', 'Click'] },
        { label: 'common.selectionBox', keys: ['Shift', 'Drag'] },
        { label: 'common.duplicate', keys: [keyLabels.primary, 'D'] },
        { label: 'common.duplicateDrag', keys: [keyLabels.alternate, 'Drag'] },
        { label: 'common.copy', keys: [keyLabels.primary, 'C'] },
        { label: 'common.paste', keys: [keyLabels.primary, 'V'] },
        { label: 'common.groupSelection', keys: [keyLabels.primary, 'G'] },
      ]
    },
    {
      title: 'shortcuts.nodes',
      items: [
        { label: 'common.mindmapAddChild', keys: ['Tab'] },
        { label: 'common.mindmapAddSibling', keys: ['Enter'] },
        { label: 'common.renameSelection', keys: ['F2'] },
      ]
    },
    {
      title: 'shortcuts.navigation',
      items: [
        { label: 'common.selectTool', keys: ['V'] },
        { label: 'common.handTool', keys: ['H'] },
        { label: 'common.panCanvas', keys: ['Space', 'Drag'] },
        { label: 'common.zoomInOut', keys: [keyLabels.primary, '+/-'] },
        { label: 'common.fitView', keys: ['Shift', '1'] },
        { label: 'common.nudgeNode', keys: ['Arrows'] },
      ]
    },
    {
      title: 'shortcuts.help',
      items: [
        { label: 'common.keyboardShortcuts', keys: ['?'] },
        { label: 'common.commandBar', keys: [keyLabels.primary, 'K'] },
      ]
    },
  ];
}

export const KEYBOARD_SHORTCUTS = getKeyboardShortcuts(true);
