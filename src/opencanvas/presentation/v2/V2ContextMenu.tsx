import { useRef } from 'react';
import { Menu, MenuItem, MenuSeparator, MenuSubmenu } from '../design-system';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { buildStyleConnectorCommand } from '../../domain/commands/styleConnectors';
import type { useV2EditActions } from './useV2EditActions';
import { platformKeys } from './v2Shortcuts';

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
  /** Opens the Inspect panel on the selection. */
  readonly onInspect: () => void;
  readonly onEditAsCode: (frameId: string) => void;
  /** Selected nodes that carry an icon; drives "Remove icon". */
  readonly iconCount: number;
  readonly onRemoveIcons: () => void;
  /** Set when the selection is one diagram frame whose icons can be toggled. */
  readonly diagramIcons: { readonly on: boolean } | null;
  readonly onToggleDiagramIcons: () => void;
  /** Set when the selection is a model placement; drives the C4 actions. */
  readonly modelElement?: { readonly id: string; readonly name: string; readonly childView: boolean; readonly editable: boolean } | null;
  /** Opens the model panel on the element's card, name ready to type. */
  readonly onEditInModel?: () => void;
  /** Map mode: the drawing cannot be edited, so a box or arrow offers only what Map can do. */
  readonly inMap?: { readonly onShowOnCanvas?: () => void; readonly onCopyToCanvas?: () => void } | null;
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
            <MenuItem onSelect={() => { actions.pasteShapes(); }} shortcut={platformKeys('⌘V')} disabled={!edit || !actions.hasClipboard()}>Paste</MenuItem>
            <MenuItem onSelect={props.onSelectAll} shortcut={platformKeys('⌘A')}>Select all</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onZoomToFit} shortcut={platformKeys('⌘0')}>Zoom to fit</MenuItem>
            <MenuItem onSelect={props.onZoomTo100} shortcut={platformKeys('⌘1')}>Zoom to 100%</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onToggleGrid} checked={props.showGrid} keepOpen>Show grid</MenuItem>
            <MenuItem onSelect={props.onToggleSnap} checked={props.snapToGrid} keepOpen>Snap to grid</MenuItem>
          </>
        ) : props.inMap ? (
          <>
            {props.modelElement ? <MenuItem onSelect={() => props.onEditInModel?.()}>Edit in model</MenuItem> : null}
            {props.inMap.onShowOnCanvas ? <MenuItem onSelect={props.inMap.onShowOnCanvas}>Show on canvas</MenuItem> : null}
            {props.inMap.onCopyToCanvas ? <MenuItem onSelect={props.inMap.onCopyToCanvas} shortcut={platformKeys('⇧M')}>Edit as drawing</MenuItem> : null}
            <MenuItem onSelect={props.onZoomToSelection} shortcut={platformKeys('⇧2')}>Zoom to selection</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onExport}>Export…</MenuItem>
            {props.modelElement ? <>
              <MenuSeparator />
              <MenuItem onSelect={() => props.onRemoveElement?.()} shortcut={platformKeys('⌘⇧⌫')} disabled={!props.modelElement.editable} danger>Remove from model</MenuItem>
            </> : null}
          </>
        ) : target.kind === 'connector' ? (
          <>
            <MenuItem onSelect={props.onEditLabel} shortcut={platformKeys('↵')} disabled={!edit}>Edit label</MenuItem>
            <MenuItem onSelect={props.onInspect} shortcut={platformKeys('⌥I')}>Inspect</MenuItem>
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
                <MenuItem onSelect={actions.copyStyle} shortcut={platformKeys('⌘⌥C')}>Copy style</MenuItem>
                <MenuItem onSelect={actions.pasteStyle} shortcut={platformKeys('⌘⌥V')} disabled={!edit}>Paste style</MenuItem>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuItem onSelect={props.onExport}>Export…</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.deleteSelection} shortcut={platformKeys('⌫')} disabled={!edit} danger>Delete</MenuItem>
          </>
        ) : (
          <>
            <MenuItem onSelect={actions.cutSelection} shortcut={platformKeys('⌘X')} disabled={!edit}>Cut</MenuItem>
            <MenuItem onSelect={actions.copySelection} shortcut={platformKeys('⌘C')}>Copy</MenuItem>
            <MenuItem onSelect={actions.duplicateSelection} shortcut={platformKeys('⌘D')} disabled={!edit}>Duplicate</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onEditLabel} shortcut={platformKeys('↵')} disabled={!edit || many}>Edit label</MenuItem>
            <MenuItem onSelect={props.onInspect} shortcut={platformKeys('⌥I')}>Inspect</MenuItem>
            {selectedFrame ? <MenuItem onSelect={() => props.onEditAsCode(selectedFrame.id)} shortcut={platformKeys('⌥C')}>Edit as code</MenuItem> : null}
            {props.diagramIcons ? (
              <MenuItem onSelect={props.onToggleDiagramIcons} checked={props.diagramIcons.on} disabled={!edit}>Icons from labels</MenuItem>
            ) : null}
            {props.iconCount > 0 ? (
              <MenuItem onSelect={props.onRemoveIcons} disabled={!edit}>{props.iconCount === 1 ? 'Remove icon' : `Remove ${props.iconCount} icons`}</MenuItem>
            ) : null}
            {props.modelElement ? (
              <>
                <MenuSeparator />
                <MenuItem onSelect={() => props.onEditInModel?.()}>Edit in model</MenuItem>
                {props.modelElement.childView ? (
                  <MenuItem onSelect={() => props.onDrillInto?.()}>Open {props.modelElement.name} view</MenuItem>
                ) : null}
                <MenuItem onSelect={() => props.onUnplace?.()} disabled={!edit || many}>Unplace from this view</MenuItem>
                <MenuItem onSelect={() => props.onRemoveElement?.()} shortcut={platformKeys('⌘⇧⌫')} disabled={!props.modelElement.editable} danger>Remove from model</MenuItem>
              </>
            ) : null}
            <MenuSubmenu label="Style">
                <MenuItem onSelect={actions.copyStyle} shortcut={platformKeys('⌘⌥C')}>Copy style</MenuItem>
                <MenuItem onSelect={actions.pasteStyle} shortcut={platformKeys('⌘⌥V')} disabled={!edit}>Paste style</MenuItem>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuSubmenu label="Reorder">
                <MenuItem onSelect={() => actions.reorderSelection('front')} shortcut={platformKeys('⌘⌥]')} disabled={!edit}>Bring to front</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('forward')} shortcut={platformKeys('⌘]')} disabled={!edit}>Bring forward</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('backward')} shortcut={platformKeys('⌘[')} disabled={!edit}>Send backward</MenuItem>
                <MenuItem onSelect={() => actions.reorderSelection('back')} shortcut={platformKeys('⌘⌥[')} disabled={!edit}>Send to back</MenuItem>
            </MenuSubmenu>
            <MenuSubmenu label="Transform">
                <MenuItem onSelect={() => actions.flipSelection('horizontal')} shortcut={many ? platformKeys('⇧H') : undefined} disabled={!edit}>Flip horizontal</MenuItem>
                <MenuItem onSelect={() => actions.flipSelection('vertical')} shortcut={many ? platformKeys('⇧V') : undefined} disabled={!edit}>Flip vertical</MenuItem>
                {many ? <>
                  {(['left', 'center-x', 'right', 'top', 'center-y', 'bottom'] as const).map((mode, index) =>
                    <MenuItem key={mode} onSelect={() => actions.alignSelection(mode)} disabled={!edit}>
                      {['Align left', 'Align centre', 'Align right', 'Align top', 'Align middle', 'Align bottom'][index]}
                    </MenuItem>)}
                  <MenuItem onSelect={() => actions.distributeSelection('horizontal')} disabled={!edit || props.selectionCount < 3}>Distribute horizontally</MenuItem>
                  <MenuItem onSelect={() => actions.distributeSelection('vertical')} disabled={!edit || props.selectionCount < 3}>Distribute vertically</MenuItem>
                </> : null}
            </MenuSubmenu>
            {many ? <MenuItem onSelect={actions.groupSelection} shortcut={platformKeys('⌘G')} disabled={!edit}>Group</MenuItem> : null}
            <MenuItem onSelect={actions.wrapInSection} shortcut={platformKeys('⌘⌥G')} disabled={!edit}>Wrap in section</MenuItem>
            {actions.canUngroup() ? <MenuItem onSelect={actions.ungroupSelection} shortcut={platformKeys('⌘⇧G')} disabled={!edit}>Ungroup</MenuItem> : null}
            <MenuSeparator />
            <MenuItem onSelect={props.onExport}>Export…</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={props.onZoomToSelection} shortcut={platformKeys('⇧2')}>Zoom to selection</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.toggleLock} shortcut={platformKeys('⌘L')} disabled={!edit}>Lock / Unlock</MenuItem>
            <MenuItem onSelect={actions.deleteSelection} shortcut={platformKeys('⌫')} disabled={!edit} danger>Delete</MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
