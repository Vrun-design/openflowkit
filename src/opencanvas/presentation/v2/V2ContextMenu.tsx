import { useRef } from 'react';
import { Menu, MenuItem, MenuSeparator } from '../design-system';
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
  readonly readOnly: boolean;
  readonly actions: ReturnType<typeof useV2EditActions>;
  readonly commit: (command: DocumentCommand) => void;
  readonly onEditLabel: () => void;
  readonly onSelectAll: () => void;
  readonly onZoomToFit: () => void;
  readonly onZoomToSelection: () => void;
  readonly onZoomTo100: () => void;
  readonly showGrid: boolean;
  readonly snapToGrid: boolean;
  readonly onToggleGrid: () => void;
  readonly onToggleSnap: () => void;
  readonly onClose: () => void;
}

// Right-click menu (docs/plan/phase-1-style.md §2). One level; the reorder
// entries are inline because the design-system Menu has no submenus.
export function V2ContextMenu(props: V2ContextMenuProps): React.JSX.Element | null {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { target, actions, readOnly } = props;
  if (!target) return null;
  const many = props.selectionCount > 1;
  const edit = !readOnly;
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
            {(['orthogonal', 'direct', 'bezier'] as const).map((route) => (
              <MenuItem key={route} role="menuitemradio" disabled={!edit}
                checked={(props.page.connectors.find((c) => c.id === target.id)?.route.kind ?? 'orthogonal') === route}
                onSelect={() => { const c = buildStyleConnectorCommand(props.page, target.id, { route }); if (c) props.commit(c); }}>
                {route === 'orthogonal' ? 'Elbow' : route === 'direct' ? 'Straight' : 'Curve'}
              </MenuItem>
            ))}
            <MenuItem onSelect={() => { const c = buildStyleConnectorCommand(props.page, target.id, { reverse: true }); if (c) props.commit(c); }} disabled={!edit}>
              Reverse direction
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.copyStyle} shortcut="⌘⌥C">Copy style</MenuItem>
            <MenuItem onSelect={actions.pasteStyle} shortcut="⌘⌥V" disabled={!edit}>Paste style</MenuItem>
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
            <MenuItem onSelect={actions.copyStyle} shortcut="⌘⌥C">Copy style</MenuItem>
            <MenuItem onSelect={actions.pasteStyle} shortcut="⌘⌥V" disabled={!edit}>Paste style</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => actions.reorderSelection('front')} shortcut="⌘⌥]" disabled={!edit}>Bring to front</MenuItem>
            <MenuItem onSelect={() => actions.reorderSelection('forward')} shortcut="⌘]" disabled={!edit}>Bring forward</MenuItem>
            <MenuItem onSelect={() => actions.reorderSelection('backward')} shortcut="⌘[" disabled={!edit}>Send backward</MenuItem>
            <MenuItem onSelect={() => actions.reorderSelection('back')} shortcut="⌘⌥[" disabled={!edit}>Send to back</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => actions.flipSelection('horizontal')} shortcut="⇧H" disabled={!edit}>Flip horizontal</MenuItem>
            <MenuItem onSelect={() => actions.flipSelection('vertical')} shortcut="⇧V" disabled={!edit}>Flip vertical</MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={actions.groupSelection} shortcut="⌘G" disabled={!edit || !many}>Group</MenuItem>
            <MenuItem onSelect={actions.ungroupSelection} shortcut="⌘⇧G" disabled={!edit || !actions.canUngroup()}>Ungroup</MenuItem>
            {many ? (
              <>
                <MenuSeparator />
                <MenuItem onSelect={() => actions.alignSelection('left')} shortcut="⌥A" disabled={!edit}>Align left</MenuItem>
                <MenuItem onSelect={() => actions.alignSelection('center-x')} shortcut="⌥H" disabled={!edit}>Align centre</MenuItem>
                <MenuItem onSelect={() => actions.alignSelection('right')} shortcut="⌥D" disabled={!edit}>Align right</MenuItem>
                <MenuItem onSelect={() => actions.alignSelection('top')} shortcut="⌥W" disabled={!edit}>Align top</MenuItem>
                <MenuItem onSelect={() => actions.alignSelection('center-y')} shortcut="⌥V" disabled={!edit}>Align middle</MenuItem>
                <MenuItem onSelect={() => actions.alignSelection('bottom')} shortcut="⌥S" disabled={!edit}>Align bottom</MenuItem>
                <MenuItem onSelect={() => actions.distributeSelection('horizontal')} shortcut="⌥⇧H" disabled={!edit || props.selectionCount < 3}>Distribute horizontally</MenuItem>
                <MenuItem onSelect={() => actions.distributeSelection('vertical')} shortcut="⌥⇧V" disabled={!edit || props.selectionCount < 3}>Distribute vertically</MenuItem>
              </>
            ) : null}
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
