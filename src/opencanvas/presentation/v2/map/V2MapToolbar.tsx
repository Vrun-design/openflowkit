import { useRef, useState } from 'react';
import type { Depth, LinkKind } from '../../../../dsl/map/types';
import { Button, Menu, MenuItem, Toolbar, Tooltip } from '../../design-system';

/** What each kind of connection is called, as the arrows say it ("calls", "uses"): the Connections menu, the box panel and the CLI viewer. */
export const MAP_LINK_WORDS: Readonly<Record<LinkKind, string>> = { import: 'imports', call: 'calls', data: 'uses', build: 'builds' };

/** The depth dial's words, shared with the CLI's one-file viewer so both say the same thing. */
export const MAP_DEPTHS: readonly { value: Depth; label: string; tip: string }[] = [
  { value: 'overview', label: 'Top level', tip: 'Only the top-level boxes, shut' },
  { value: 'detailed', label: 'One level in', tip: 'Open the top-level boxes' },
  { value: 'everything', label: 'All levels', tip: 'Open as deep as the screen allows' },
];

export interface V2MapToolbarProps {
  readonly depth: Depth | null;
  readonly onDepth: (depth: Depth) => void;
  /** Connection kinds to switch; leave out (with onToggleLayer) when the map has fewer than two, as a C4 map does. */
  readonly layers?: readonly { kind: LinkKind; label: string; count: number; on: boolean }[];
  readonly onToggleLayer?: (kind: LinkKind) => void;
  /** Pin the map as a Canvas page; absent when pinning cannot be offered (a shared view), disabled while nothing is drawn. */
  readonly onPin?: () => void;
  readonly canPin?: boolean;
  /** The map is still being laid out (or read): the toolbar says so instead of leaving a blank canvas unexplained. */
  readonly drawing?: boolean;
}

/** Map mode's depth, connection layers and Edit as drawing. The host places it (beside the camera controls). */
export function V2MapToolbar(p: V2MapToolbarProps): React.JSX.Element {
  const { layers, onToggleLayer } = p;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Toolbar label="Map depth" className="ofk-v2-map-toolbar">
        {/* One dial, the same segmented track as Canvas | Map: how deep the boxes open. A click on a box opens or shuts just that one. */}
        <div className="ofk-v2-mode" role="group" aria-label="Depth">
          {MAP_DEPTHS.map((d) => (
            <Tooltip key={d.value} content={d.tip}>
              <Button variant="quiet" selected={p.depth === d.value} onClick={() => p.onDepth(d.value)}>{d.label}</Button>
            </Tooltip>
          ))}
        </div>
        {p.drawing ? <span className="ofk-caption" role="status">Drawing the map…</span> : null}
        {layers && onToggleLayer ? (
          <>
            <span className="ofk-v2-divider" aria-hidden="true" />
            <Tooltip content="Which kinds of connections are drawn">
              <Button ref={ref} variant="quiet" aria-haspopup="menu" aria-expanded={open} disabled={layers.length === 0} onClick={() => setOpen((o) => !o)}>Connections</Button>
            </Tooltip>
          </>
        ) : null}
        {p.onPin ? (
          <>
            <span className="ofk-v2-divider" aria-hidden="true" />
            <Tooltip content="Copies this map to a new Canvas page you can rearrange and draw on" shortcut="⇧M">
              <Button variant="quiet" disabled={!p.canPin} onClick={p.onPin}>Edit as drawing</Button>
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
