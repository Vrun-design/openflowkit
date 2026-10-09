import { useRef, useState } from 'react';
import { IconFold, IconFoldDown } from '@tabler/icons-react';
import type { Depth, LinkKind } from '../../../../dsl/map/types';
import { Button, Icon, IconButton, Menu, MenuItem, Toolbar, Tooltip } from '../../design-system';

const DEPTHS: { value: Depth; label: string; tip: string }[] = [
  { value: 'overview', label: 'Overview', tip: 'Top-level boxes, shut' },
  { value: 'detailed', label: 'Detailed', tip: 'Open the top level' },
  { value: 'everything', label: 'Everything', tip: 'As deep as the screen allows' },
];

export interface V2MapToolbarProps {
  readonly depth: Depth | null;
  readonly onDepth: (depth: Depth) => void;
  readonly onExpandOne: () => void;
  readonly onCollapseAll: () => void;
  /** Connection kinds to switch; leave out (with onToggleLayer) when the map has fewer than two, as a C4 map does. */
  readonly layers?: readonly { kind: LinkKind; label: string; count: number; on: boolean }[];
  readonly onToggleLayer?: (kind: LinkKind) => void;
  readonly canExpand: boolean;
}

/** Map mode's depth, expand/collapse and connection layers. The host places it (beside the camera controls). */
export function V2MapToolbar(p: V2MapToolbarProps): React.JSX.Element {
  const { layers, onToggleLayer } = p;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Toolbar label="Map depth" className="ofk-v2-map-toolbar">
        {DEPTHS.map((d) => (
          <Tooltip key={d.value} content={d.tip}>
            <Button variant="quiet" selected={p.depth === d.value} onClick={() => p.onDepth(d.value)}>{d.label}</Button>
          </Tooltip>
        ))}
        <span className="ofk-v2-divider" aria-hidden="true" />
        <Tooltip content="Open every box one level deeper"><IconButton variant="quiet" label="Expand one level" icon={<Icon icon={IconFoldDown} />} disabled={!p.canExpand} onClick={p.onExpandOne} /></Tooltip>
        <Tooltip content="Close every box"><IconButton variant="quiet" label="Collapse all" icon={<Icon icon={IconFold} />} onClick={p.onCollapseAll} /></Tooltip>
        {layers && onToggleLayer ? (
          <>
            <span className="ofk-v2-divider" aria-hidden="true" />
            <Tooltip content="Which kinds of connections are drawn">
              <Button ref={ref} variant="quiet" aria-haspopup="menu" aria-expanded={open} disabled={layers.length === 0} onClick={() => setOpen((o) => !o)}>Connections</Button>
            </Tooltip>
          </>
        ) : null}
      </Toolbar>
      {layers && onToggleLayer ? (
        <Menu open={open} anchorRef={ref} onClose={() => setOpen(false)} label="Connections" placement="top-start">
          {layers.map((l) => (
            <MenuItem key={l.kind} checked={l.on} keepOpen onSelect={() => onToggleLayer(l.kind)}>{`${l.label} · ${l.count}`}</MenuItem>
          ))}
        </Menu>
      ) : null}
    </>
  );
}
