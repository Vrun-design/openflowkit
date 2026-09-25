import { useRef } from 'react';
import { Menu, MenuItem, MenuSeparator, MenuSubmenu } from '../design-system';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { buildStyleConnectorCommand } from '../../domain/commands/styleConnectors';
import type { useV2EditActions } from './useV2EditActions';

export type ContextMenuTarget =
  | { readonly kind: 'nodes'; readonly x: number; readonly y: number }
  | { readonly kind: 'connector'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly kind: 'canvas'; readonly x: number; readonly y: number };

interface V2ContextMenuProps {
  readonly target: ContextMenuTarget | null;
  readonly page: ScenePage;
  readonly selectionCount: number;
  readonly selectedNodeId: string | null;
  readonly readOnly: boolean;
  readonly actions: ReturnType<typeof useV2EditActions>;
  readonly commit: (command: DocumentCommand) => void;
  readonly onEditLabel: () => void;
  readonly onEditAsCode: (frameId: string) => void;
  /** Selected nodes that carry an icon; drives "Remove icon". */
  readonly iconCount: number;
  readonly onRemoveIcons: () => void;
  /** Set when the selection is one diagram frame whose icons can be toggled. */
  readonly diagramIcons: { readonly on: boolean } | null;
  readonly onToggleDiagramIcons: () => void;
  /** Set when the selection is a model placement; drives the C4 actions. */
  readonly modelElement?: { readonly id: string; readonly name: string; readonly childView: boolean } | null;
  readonly onDrillInto?: () => void;
  readonly onUnplace?: () => void;
  readonly onRemoveElement?: () => void;
  readonly onSelectAll: () => void;
  /** Opens the export panel on the current selection, anchored at the menu. */
  readonly onExport: () => void;
  readonly onZoomToFit: () => void;
  readonly onZoomToSelection: () => void;
  readonly onZoomTo100: () => void;
  readonly showGrid: boolean;
  readonly snapToGrid: boolean;
  readonly onToggleGrid: () => void;
  readonly onToggleSnap: () => void;
  readonly onClose: () => void;
}

export function V2ContextMenu(props: V2ContextMenuProps): React.JSX.Element | null {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { target, actions, readOnly } = props;
  if (!target) return null;
  const many = props.selectionCount > 1;
  const edit = !readOnly;
  const selectedFrame = target.kind === 'nodes' && props.selectionCount === 1
    ? props.page.nodes.find((node) => node.id === props.selectedNodeId && node.kind === 'frame' && node.metadata.dsl && typeof node.metadata.dsl === 'object')
    : undefined;
  return (
    <>
      <div ref={anchorRef} aria-hidden="true" style={{ position: 'fixed', left: target.x, top: target.y, width: 1, height: 1, pointerEvents: 'none' }} />
      <Menu open anchorRef={anchorRef} onClose={props.onClose} label="Canvas actions" placement="bottom-start"
        data-context-menu onPointerDown={(event) => event.stopPropagation()}>
        {target.kind === 'canvas' ? (
          <>
            <MenuItem onSelect={() => { void actions.pasteClipboard(); }} shortcut="⌘V" disabled={!edit || !actions.hasClipboard()}>Paste</MenuItem>
            <MenuItem onSelect={props.onSelectAll} shortcut="⌘A">Select all</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onZoomToFit} shortcut="⇧1">Zoom to fit</MenuItem>
            <MenuItem onSelect={props.onZoomTo100} shortcut="⌘1">Zoom to 100%</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onToggleGrid} checked={props.showGrid} keepOpen>Show grid</MenuItem>
            <MenuItem onSelect={props.onToggleSnap} checked={props.snapToGrid} keepOpen>Snap to grid</MenuItem>
          </>
        ) : target.kind === 'connector' ? (
          <>
            <MenuItem onSelect={props.onEditLabel} shortcut="↵" disabled={!edit}>Edit label</MenuItem>
            <MenuSeparator />
            <MenuSubmenu label="Path">
                {(['orthogonal', 'direct', 'bezier'] as const).map((route) => (
                  <MenuItem key={route} role="menuitemradio" disabled={!edit}
                    checked={props.page.connectors.find((c) => c.id === target.id)?.route.kind === route}
                    onSelect={() => { const c = buildStyleConnectorCommand(props.page, target.id, { route }); if (c) props.commit(c); }}>
                    {route === 'orthogonal' ? 'Elbow' : route === 'direct' ? 'Straight' : 'Curve'}
                  </MenuItem>
                ))}
            </MenuSubmenu>
            <MenuItem onSelect={() => { const c = buildStyleConnectorCommand(props.page, target.id, { reverse: true }); if (c) props.commit(c); }} disabled={!edit}>
              Reverse direction
            </MenuItem>
            <MenuSeparator />
            <MenuSubmenu label="Style">
                <MenuItem onSelect={actions.copyStyle} shortcut="⌘⌥C">Copy style</MenuItem>
                <MenuItem onSelect={actions.pasteStyle} shortcut="⌘⌥V" disabled={!edit}>Paste style</MenuItem>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuItem onSelect={props.onExport}>Export…</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.deleteSelection} shortcut="⌫" disabled={!edit} danger>Delete</MenuItem>
          </>
        ) : (
          <>
            <MenuItem onSelect={actions.cutSelection} shortcut="⌘X" disabled={!edit}>Cut</MenuItem>
            <MenuItem onSelect={actions.copySelection} shortcut="⌘C">Copy</MenuItem>
            <MenuItem onSelect={actions.duplicateSelection} shortcut="⌘D" disabled={!edit}>Duplicate</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onEditLabel} shortcut="↵" disabled={!edit || many}>Edit label</MenuItem>
            {selectedFrame ? <MenuItem onSelect={() => props.onEditAsCode(selectedFrame.id)} shortcut="⌥D">Edit as code</MenuItem> : null}
            {props.diagramIcons ? (
              <MenuItem onSelect={props.onToggleDiagramIcons} checked={props.diagramIcons.on} disabled={!edit}>Icons from labels</MenuItem>
            ) : null}
            {props.iconCount > 0 ? (
              <MenuItem onSelect={props.onRemoveIcons} disabled={!edit}>{props.iconCount === 1 ? 'Remove icon' : `Remove ${props.iconCount} icons`}</MenuItem>
            ) : null}
            {props.modelElement ? (
              <>
                <MenuSeparator />
                {props.modelElement.childView ? (
                  <MenuItem onSelect={() => props.onDrillInto?.()}>Open {props.modelElement.name} view</MenuItem>
                ) : null}
                <MenuItem onSelect={() => props.onUnplace?.()} disabled={!edit || many}>Unplace from this view</MenuItem>
                <MenuItem onSelect={() => props.onRemoveElement?.()} disabled={!edit} danger>Remove from model</MenuItem>
              </>
            ) : null}
            <MenuSubmenu label="Style">
                <MenuItem onSelect={actions.copyStyle} shortcut="⌘⌥C">Copy style</MenuItem>
                <MenuItem onSelect={actions.pasteStyle} shortcut="⌘⌥V" disabled={!edit}>Paste style</MenuItem>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuSubmenu label="Reorder">
                <MenuItem onSelect={() => actions.reorderSelection('front')} shortcut="⌘⌥]" disabled={!edit}>Bring to front</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('forward')} shortcut="⌘]" disabled={!edit}>Bring forward</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('backward')} shortcut="⌘[" disabled={!edit}>Send backward</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('back')} shortcut="⌘⌥[" disabled={!edit}>Send to back</MenuItem>
            </MenuSubmenu>
            <MenuSubmenu label="Transform">
                <MenuItem onSelect={() => actions.flipSelection('horizontal')} shortcut="⇧H" disabled={!edit}>Flip horizontal</MenuItem>
                <MenuItem onSelect={() => actions.flipSelection('vertical')} shortcut="⇧V" disabled={!edit}>Flip vertical</MenuItem>
                {many ? <>
                  {(['left', 'center-x', 'right', 'top', 'center-y', 'bottom'] as const).map((mode, index) =>
                    <MenuItem key={mode} onSelect={() => actions.alignSelection(mode)} disabled={!edit}>
                      {['Align left', 'Align centre', 'Align right', 'Align top', 'Align middle', 'Align bottom'][index]}
                    </MenuItem>)}
                  <MenuItem onSelect={() => actions.distributeSelection('horizontal')} disabled={!edit || props.selectionCount < 3}>Distribute horizontally</MenuItem>
                  <MenuItem onSelect={() => actions.distributeSelection('vertical')} disabled={!edit || props.selectionCount < 3}>Distribute vertically</MenuItem>
                </> : null}
            </MenuSubmenu>
            {many ? <MenuItem onSelect={actions.groupSelection} shortcut="⌘G" disabled={!edit}>Group</MenuItem> : null}
            <MenuItem onSelect={actions.wrapInSection} shortcut="⌘⌥G" disabled={!edit}>Wrap in section</MenuItem>
            {actions.canUngroup() ? <MenuItem onSelect={actions.ungroupSelection} shortcut="⌘⇧G" disabled={!edit}>Ungroup</MenuItem> : null}
            <MenuSeparator />
            <MenuItem onSelect={props.onExport}>Export…</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onZoomToSelection} shortcut="⇧2">Zoom to selection</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.toggleLock} shortcut="⌘L" disabled={!edit}>Lock / Unlock</MenuItem>
            <MenuItem onSelect={actions.deleteSelection} shortcut="⌫" disabled={!edit} danger>Delete</MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
