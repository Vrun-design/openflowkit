import { useRef, useState } from 'react';
import { IconChevronRight, IconCopy, IconDots, IconEye, IconEyeOff, IconLayersIntersect, IconLock, IconLockOpen, IconSquare, IconTrash, IconTypography, IconVectorBezier2 } from '@tabler/icons-react';
import type { CanvasSelection } from '../../application/selection/selection';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { Icon, IconButton, Menu, MenuItem, MenuSeparator, Panel } from '../design-system';

export type LayerObjectAction = 'hide' | 'lock' | 'duplicate' | 'delete';
interface V2TreePanelProps {
  readonly page: ScenePage;
  readonly selection: CanvasSelection;
  readonly selectedConnectorIds: readonly string[];
  readonly onSelectNode: (id: string, additive: boolean) => void;
  readonly onSelectConnector: (id: string) => void;
  readonly onObjectAction: (id: string, action: LayerObjectAction) => void;
  readonly onConnectorMenu: (id: string, x: number, y: number) => void;
  readonly onConnectorAction: (id: string, action: LayerObjectAction) => void;
  readonly onClose: () => void;
  readonly readOnly: boolean;
}

function objectName(node: SceneNode): string {
  const label = node.content.label;
  if (typeof label === 'string' && label.trim()) return label;
  return node.kind.charAt(0).toUpperCase() + node.kind.slice(1);
}

export function V2TreePanel(props: V2TreePanelProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [menuNode, setMenuNode] = useState<string | null>(null);
  const [menuConnector, setMenuConnector] = useState<string | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const nodeById = new Map(props.page.nodes.map((node) => [node.id, node]));
  const selectedMenuNode = menuNode ? nodeById.get(menuNode) : undefined;
  const selectedMenuConnector = props.page.connectors.find((connector) => connector.id === menuConnector);
  const menuTarget = selectedMenuNode ?? selectedMenuConnector;
  const menuHidden = selectedMenuNode?.content.sectionHidden ?? selectedMenuConnector?.metadata.hidden;
  const menuLocked = selectedMenuNode?.content.sectionLocked ?? selectedMenuConnector?.metadata.locked;
  function menuAction(action: LayerObjectAction): void {
    if (selectedMenuNode) props.onObjectAction(selectedMenuNode.id, action);
    else if (selectedMenuConnector) props.onConnectorAction(selectedMenuConnector.id, action);
  }
  const children = new Map<string | null, SceneNode[]>();
  for (const node of [...props.page.nodes].sort((a, b) => b.zIndex - a.zIndex)) {
    const parent = node.parentId && nodeById.has(node.parentId) ? node.parentId : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(node);
    children.set(parent, siblings);
  }
  function openMenu(node: SceneNode, anchor: HTMLElement): void {
    anchorRef.current = anchor;
    setMenuConnector(null);
    setMenuNode(node.id);
  }
  function renderNodes(parent: string | null, depth = 0): React.ReactNode {
    if (depth > props.page.nodes.length) return null;
    return children.get(parent)?.map((node) => {
      const name = objectName(node);
      const nested = children.has(node.id);
      const expanded = !collapsed.has(node.id);
      const hidden = node.content.sectionHidden === true;
      const locked = node.content.sectionLocked === true;
      const glyph = nested || node.kind === 'frame' ? IconLayersIntersect : node.kind === 'text' ? IconTypography : IconSquare;
      return <li key={node.id}>
        <div className="ofk-object-row" data-selected={props.selection.nodeIds.includes(node.id) || undefined}
          data-hidden={hidden || undefined} style={{ paddingInlineStart: 8 + depth * 14 }}
          onContextMenu={(event) => { event.preventDefault(); openMenu(node, event.currentTarget); }}>
          {nested ? <button type="button" className="ofk-object-expand" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`}
            aria-expanded={expanded} onClick={() => setCollapsed((current) => {
              const next = new Set(current); if (expanded) next.add(node.id); else next.delete(node.id); return next;
            })}><Icon icon={IconChevronRight} /></button> : <span className="ofk-object-indent" />}
          <button type="button" className="ofk-object-select" aria-pressed={props.selection.nodeIds.includes(node.id)}
            onClick={(event) => props.onSelectNode(node.id, event.shiftKey || event.metaKey || event.ctrlKey)}
            onKeyDown={(event) => {
              if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault(); openMenu(node, event.currentTarget);
              }
            }} title={name}><Icon icon={glyph} /><span>{name}</span></button>
          <div className="ofk-object-actions">
            <IconButton variant="quiet" label={`${hidden ? 'Show' : 'Hide'} ${name}`} disabled={props.readOnly}
              data-persistent={hidden || undefined} icon={<Icon icon={hidden ? IconEyeOff : IconEye} />}
              onClick={() => props.onObjectAction(node.id, 'hide')} />
            <IconButton variant="quiet" label={`${locked ? 'Unlock' : 'Lock'} ${name}`} disabled={props.readOnly}
              data-persistent={locked || undefined} icon={<Icon icon={locked ? IconLock : IconLockOpen} />}
              onClick={() => props.onObjectAction(node.id, 'lock')} />
            <IconButton variant="quiet" label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={menuNode === node.id}
              icon={<Icon icon={IconDots} />} onClick={(event) => openMenu(node, event.currentTarget)} />
          </div>
        </div>
        {nested && expanded ? <ul>{renderNodes(node.id, depth + 1)}</ul> : null}
      </li>;
    });
  }
  return <Panel title="Layers" side="start" onClose={props.onClose} className="ofk-v2-layers-panel"
    tools={<span className="ofk-v2-panel-badge" title={props.page.name}>{props.page.name}</span>}>
    {props.page.nodes.length + props.page.connectors.length === 0 ? <div className="ofk-panel-empty">
      <Icon icon={IconLayersIntersect} /><strong>No objects yet</strong><p>Add a shape or generate a diagram.<br />Manage its layers here.</p>
    </div> : <ul className="ofk-object-list" aria-label="Objects on this page" onKeyDown={(event) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches('.ofk-object-select')) return;
      const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.ofk-object-select'));
      const index = rows.indexOf(event.target as HTMLButtonElement);
      let next: HTMLButtonElement | undefined;
      if (event.key === 'ArrowDown') next = rows[index + 1];
      else if (event.key === 'ArrowUp') next = rows[index - 1];
      else if (event.key === 'Home') next = rows[0];
      else if (event.key === 'End') next = rows.at(-1);
      else return;
      event.preventDefault(); event.stopPropagation(); next?.focus();
    }}>
      {renderNodes(null)}
      {props.page.connectors.map((connector) => {
        const name = connector.labels[0]?.text || 'Connection';
        const hidden = connector.metadata.hidden === true;
        const locked = connector.metadata.locked === true;
        const open = (element: HTMLElement) => { anchorRef.current = element; setMenuNode(null); setMenuConnector(connector.id); };
        return <li key={connector.id}><div className="ofk-object-row" data-selected={props.selectedConnectorIds.includes(connector.id) || undefined}
          data-hidden={hidden || undefined}
          onContextMenu={(event) => { event.preventDefault(); open(event.currentTarget); }}>
          <span className="ofk-object-indent" /><button type="button" className="ofk-object-select"
            onClick={() => props.onSelectConnector(connector.id)}><Icon icon={IconVectorBezier2} /><span>{name}</span></button>
          <div className="ofk-object-actions">
            <IconButton variant="quiet" label={`${hidden ? 'Show' : 'Hide'} ${name}`} disabled={props.readOnly}
              data-persistent={hidden || undefined} icon={<Icon icon={hidden ? IconEyeOff : IconEye} />}
              onClick={() => props.onConnectorAction(connector.id, 'hide')} />
            <IconButton variant="quiet" label={`${locked ? 'Unlock' : 'Lock'} ${name}`} disabled={props.readOnly}
              data-persistent={locked || undefined} icon={<Icon icon={locked ? IconLock : IconLockOpen} />}
              onClick={() => props.onConnectorAction(connector.id, 'lock')} />
            <IconButton variant="quiet" label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={menuConnector === connector.id}
              icon={<Icon icon={IconDots} />} onClick={(event) => open(event.currentTarget)} />
          </div>
        </div></li>;
      })}
    </ul>}
    <Menu open={!!menuTarget} anchorRef={anchorRef} onClose={() => { setMenuNode(null); setMenuConnector(null); }} label="Object actions" placement="right-start">
      {menuTarget ? <>
        <MenuItem icon={<Icon icon={IconCopy} />} disabled={props.readOnly} onSelect={() => menuAction('duplicate')}>Duplicate</MenuItem>
        {selectedMenuConnector ? <MenuItem disabled={props.readOnly} onSelect={() => {
          const box = anchorRef.current?.getBoundingClientRect();
          if (box) props.onConnectorMenu(selectedMenuConnector.id, box.right, box.top);
        }}>Edit connection</MenuItem> : null}
        <MenuSeparator />
        <MenuItem icon={<Icon icon={IconEye} />} disabled={props.readOnly} onSelect={() => menuAction('hide')}>{menuHidden ? 'Show' : 'Hide'}</MenuItem>
        <MenuItem icon={<Icon icon={IconLock} />} disabled={props.readOnly} onSelect={() => menuAction('lock')}>{menuLocked ? 'Unlock' : 'Lock'}</MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Icon icon={IconTrash} />} danger disabled={props.readOnly} onSelect={() => menuAction('delete')}>Delete</MenuItem>
      </> : null}
    </Menu>
  </Panel>;
}
