import { useRef, type RefObject } from 'react';
import type { ScenePage } from '../../domain/document/types';
import {
  buildPasteProductionSelectionCommand,
  copyProductionSelection,
  type ProductionClipboardSnapshot,
} from '../../application/selection/clipboard';
import {
  buildAlignCommand, buildDistributeCommand, buildFlipCommand, buildStepOrderCommand,
} from '../../domain/commands/arrangeNodes';
import { buildUngroupCommand, buildWrapCommand, type WrapKind } from '../../domain/commands/groupNodes';
import { buildPasteStyleCommand, copyConnectorStyle, copyNodeStyle, type StyleClipboard } from '../../domain/commands/styleClipboard';
import type { AlignMode, DistributeAxis } from '../../domain/transforms/arrangement';
import { resolveNodeStyle } from '../../domain/nodes/nodeStyle';
import { buildStyleNodesCommand } from '../../domain/commands/styleNodes';
import {
  clearSelection,
  replaceSelection,
  type CanvasSelection,
} from '../../application/selection/selection';
import type { DocumentCommand } from '../../domain/commands/types';
import {
  buildDeleteSelectionCommand,
  buildDuplicateSelectionCommand,
  buildMoveNodesCommand,
  buildReorderCommand,
  buildToggleLockCommand,
} from '../../domain/commands/sceneEdits';

const CLIPBOARD_FORMAT = 'openflowkit.selection';

interface V2EditActionsOptions {
  readonly commit: (command: DocumentCommand) => void;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly selectedConnectorIds: readonly string[];
  readonly mintId: (prefix: string) => string;
  readonly readOnly: boolean;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (connectorIds: readonly string[]) => void;
  readonly announce: (message: string) => void;
}

// Commits scoped to the current selection: the context bar and keyboard
// share these, and both stay inert in read-only mode. Consumers read them
// through refs or plain props, so no memoization is needed.
export function useV2EditActions(options: V2EditActionsOptions) {
  const { pageRef, selectionRef, selectedConnectorIds, readOnly } = options;
  const clipboardRef = useRef<ProductionClipboardSnapshot | null>(null);
  const styleClipboardRef = useRef<StyleClipboard>({});
  // Style copy/paste wants one subject; delete and duplicate take them all.
  const selectedConnectorId = selectedConnectorIds.length === 1 ? selectedConnectorIds[0]! : null;
  const connectorIds = () => selectedConnectorIds;
  const editablePage = () => {
    const page = pageRef.current;
    return page && !readOnly ? page : null;
  };

  const deleteSelection = () => {
    const page = editablePage();
    if (!page || (selectionRef.current.nodeIds.length === 0 && selectedConnectorIds.length === 0)) return;
    options.commit(buildDeleteSelectionCommand(page, selectionRef.current.nodeIds, connectorIds()));
    options.applySelection(clearSelection());
    options.applyConnectorSelection([]);
    options.announce('Selection deleted.');
  };

  const duplicateSelection = () => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    const command = buildDuplicateSelectionCommand(
      page,
      selectionRef.current.nodeIds,
      connectorIds(),
      options.mintId
    );
    options.commit(command);
    options.applySelection(
      replaceSelection(
        command.commands.flatMap((child) => (child.kind === 'insert-node' ? [child.node.id] : []))
      )
    );
    options.applyConnectorSelection([]);
    options.announce('Selection duplicated.');
  };

  const nudgeSelection = (delta: { x: number; y: number }) => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    options.commit(buildMoveNodesCommand(page, selectionRef.current.nodeIds, delta));
  };

  const reorderSelection = (direction: 'front' | 'back' | 'forward' | 'backward') => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    const command = direction === 'front' || direction === 'back'
      ? buildReorderCommand(page, selectionRef.current.nodeIds, direction)
      : buildStepOrderCommand(page, selectionRef.current.nodeIds, direction);
    if (command && (command.kind !== 'batch' || command.commands.length > 0)) options.commit(command);
  };

  const commitMaybe = (command: ReturnType<typeof buildAlignCommand>) => { if (command) options.commit(command); };
  const alignSelection = (mode: AlignMode) => {
    const page = editablePage();
    if (page) commitMaybe(buildAlignCommand(page, selectionRef.current.nodeIds, mode));
  };
  const distributeSelection = (axis: DistributeAxis) => {
    const page = editablePage();
    if (page) commitMaybe(buildDistributeCommand(page, selectionRef.current.nodeIds, axis));
  };
  const flipSelection = (axis: 'horizontal' | 'vertical') => {
    const page = editablePage();
    if (page) commitMaybe(buildFlipCommand(page, selectionRef.current.nodeIds, axis));
  };

  // Clipboard: in-memory snapshot is the truth; the system clipboard gets a
  // JSON copy so a paste survives a reload or crosses tabs when allowed.
  const copySelection = () => {
    const page = pageRef.current;
    if (!page || selectionRef.current.nodeIds.length === 0) return false;
    const snapshot = copyProductionSelection(page, selectionRef.current.nodeIds);
    clipboardRef.current = snapshot;
    void navigator.clipboard?.writeText(JSON.stringify({ format: CLIPBOARD_FORMAT, ...snapshot })).catch(() => undefined);
    options.announce(`${snapshot.nodes.length} copied.`);
    return true;
  };
  const cutSelection = () => { if (copySelection()) deleteSelection(); };
  const pasteClipboard = async () => {
    const page = editablePage();
    if (!page) return;
    let snapshot = clipboardRef.current;
    try {
      const text = await navigator.clipboard?.readText();
      const parsed = text ? JSON.parse(text) as { format?: string } & ProductionClipboardSnapshot : null;
      if (parsed?.format === CLIPBOARD_FORMAT && Array.isArray(parsed.nodes)) snapshot = parsed;
    } catch { /* permission denied or not JSON: in-memory copy wins */ }
    if (!snapshot || snapshot.nodes.length === 0) return;
    const { command, pastedNodeIds } = buildPasteProductionSelectionCommand(
      pageRef.current ?? page, snapshot, (kind) => options.mintId(kind)
    );
    options.commit(command);
    options.applyConnectorSelection([]);
    options.applySelection(replaceSelection(pastedNodeIds));
    options.announce(`${pastedNodeIds.length} pasted.`);
  };
  const hasClipboard = () => clipboardRef.current !== null;

  const wrapSelection = (kind: WrapKind) => {
    const page = editablePage();
    if (!page) return;
    const id = options.mintId(kind);
    const command = buildWrapCommand(page, selectionRef.current.nodeIds, id, kind);
    if (!command) return;
    options.commit(command);
    options.applySelection(replaceSelection([id]));
    options.announce(kind === 'group' ? 'Grouped.' : 'Wrapped in a section.');
  };
  const groupSelection = () => wrapSelection('group');
  const wrapInSection = () => wrapSelection('section');
  const ungroupSelection = () => {
    const page = editablePage();
    if (!page) return;
    const command = buildUngroupCommand(page, selectionRef.current.nodeIds);
    if (!command) return;
    const released = command.commands.flatMap((child) => (child.kind === 'set-node' ? [child.after.id] : []));
    options.commit(command);
    options.applySelection(replaceSelection(released));
    options.announce('Ungrouped.');
  };
  const canUngroup = () => {
    const page = pageRef.current;
    return !!page && selectionRef.current.nodeIds.some((id) => {
      const kind = page.nodes.find((node) => node.id === id)?.kind;
      return kind === 'group' || kind === 'section';
    });
  };

  // ⌘B/I/U: toggle against the primary node's resolved style so mixed
  // selections settle on one value.
  const toggleTextStyle = (toggle: 'bold' | 'italic' | 'underline') => {
    const page = editablePage();
    const ids = selectionRef.current.nodeIds;
    const primary = page?.nodes.find((node) => node.id === (selectionRef.current.primaryNodeId ?? ids[0]));
    if (!page || !primary) return;
    const style = resolveNodeStyle(primary);
    const patch = toggle === 'bold' ? { fontWeight: style.fontWeight === 700 ? 400 : 700 }
      : toggle === 'italic' ? { fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' }
        : { textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline' };
    commitMaybe(buildStyleNodesCommand(page, ids, patch));
  };

  const copyStyle = () => {
    const page = pageRef.current;
    if (!page) return;
    const connector = selectedConnectorId ? page.connectors.find((candidate) => candidate.id === selectedConnectorId) : null;
    const node = page.nodes.find((candidate) => candidate.id === selectionRef.current.primaryNodeId);
    if (connector) styleClipboardRef.current = { ...styleClipboardRef.current, connector: copyConnectorStyle(connector) };
    else if (node) styleClipboardRef.current = { ...styleClipboardRef.current, node: copyNodeStyle(node) };
    else return;
    options.announce('Style copied.');
  };
  const pasteStyle = () => {
    const page = editablePage();
    if (!page) return;
    const command = buildPasteStyleCommand(page, selectionRef.current.nodeIds, selectedConnectorId, styleClipboardRef.current);
    if (command) { options.commit(command); options.announce('Style pasted.'); }
  };

  const toggleLock = () => {
    const page = editablePage();
    if (!page || selectionRef.current.nodeIds.length === 0) return;
    const command = buildToggleLockCommand(page, selectionRef.current.nodeIds);
    options.commit(command);
    options.announce(command.label === 'Lock' ? 'Selection locked.' : 'Selection unlocked.');
  };

  return {
    deleteSelection, duplicateSelection, nudgeSelection, reorderSelection, toggleLock,
    alignSelection, distributeSelection, flipSelection,
    copySelection, cutSelection, pasteClipboard, hasClipboard, copyStyle, pasteStyle, toggleTextStyle,
    groupSelection, wrapInSection, ungroupSelection, canUngroup,
  };
}
