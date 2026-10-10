import { useRef, useState, type RefObject } from 'react';
import { IconFold, IconFoldDown, IconLayoutSidebarRight, IconMaximize } from '@tabler/icons-react';
import type { Depth, LinkKind, MapModel } from '../../dsl/map/types';
import { Button, FloatingRegion, Icon, IconButton, Menu, MenuItem, Toolbar, Tooltip } from '../../opencanvas/presentation/design-system';
import { MAP_DEPTHS as DEPTHS, MAP_LINK_WORDS } from '../../opencanvas/presentation/v2/map/V2MapToolbar';
import { MapSearch } from './MapSearch';

export interface MapToolbarProps {
  model: MapModel;
  depth: Depth | null;
  onDepth: (depth: Depth) => void;
  onLevel: () => void;
  onCollapse: () => void;
  counts: Partial<Record<LinkKind, number>>;
  layers: ReadonlySet<LinkKind>;
  onLayer: (kind: LinkKind) => void;
  onReveal: (id: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onFit: () => void;
  panelOpen: boolean;
  onPanel: () => void;
}

/** Depth presets (the editor's words), one level at a time, connections, search, fit. Menus follow the design system's menu contract. */
export function MapToolbar(p: MapToolbarProps): React.JSX.Element {
  const [menu, setMenu] = useState<'depth' | 'layers' | null>(null);
  const depthRef = useRef<HTMLButtonElement>(null);
  const layersRef = useRef<HTMLButtonElement>(null);
  const kinds = (Object.keys(p.counts) as LinkKind[]).sort();
  const toggle = (which: 'depth' | 'layers') => setMenu((m) => (m === which ? null : which));
  return (
    <FloatingRegion slot="top-start">
      <Toolbar label="Map" className="map-toolbar">
        <Tooltip content="How many levels are open">
          <Button ref={depthRef} variant="quiet" aria-haspopup="menu" aria-expanded={menu === 'depth'} onClick={() => toggle('depth')}>
            {`Depth: ${DEPTHS.find((d) => d.value === p.depth)?.label ?? 'Custom'}`}
          </Button>
        </Tooltip>
        <Menu open={menu === 'depth'} anchorRef={depthRef} onClose={() => setMenu(null)} label="Depth">
          {DEPTHS.map((d) => <MenuItem key={d.value} role="menuitemradio" checked={p.depth === d.value} onSelect={() => p.onDepth(d.value)}>{d.label}</MenuItem>)}
        </Menu>
        <Tooltip content="Open every box one level deeper"><IconButton variant="quiet" label="Expand one level" icon={<Icon icon={IconFoldDown} />} onClick={p.onLevel} /></Tooltip>
        <Tooltip content="Close every box"><IconButton variant="quiet" label="Collapse all" icon={<Icon icon={IconFold} />} onClick={p.onCollapse} /></Tooltip>
        <Tooltip content="Which kinds of connections are drawn">
          <Button ref={layersRef} variant="quiet" disabled={kinds.length === 0} aria-haspopup="menu" aria-expanded={menu === 'layers'} onClick={() => toggle('layers')}>Connections</Button>
        </Tooltip>
        <Menu open={menu === 'layers'} anchorRef={layersRef} onClose={() => setMenu(null)} label="Connections">
          {kinds.map((k) => <MenuItem key={k} checked={p.layers.has(k)} keepOpen onSelect={() => p.onLayer(k)}>{`${MAP_LINK_WORDS[k]} · ${p.counts[k]}`}</MenuItem>)}
        </Menu>
        <MapSearch model={p.model} inputRef={p.searchRef} onReveal={p.onReveal} />
        <Tooltip content="Fit the map" shortcut="F"><IconButton variant="quiet" label="Fit to screen" icon={<Icon icon={IconMaximize} />} onClick={p.onFit} /></Tooltip>
        <Tooltip content="Details panel"><IconButton variant="quiet" label="Details panel" selected={p.panelOpen} icon={<Icon icon={IconLayoutSidebarRight} />} onClick={p.onPanel} /></Tooltip>
      </Toolbar>
    </FloatingRegion>
  );
}
