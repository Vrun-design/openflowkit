import { useCallback, useMemo, useState } from 'react';
import type { LinkKind, MapModel } from '../../../../dsl/map/types';
import { aggregate } from '../../../../dsl/map/view';
import { edgeLayerCounts } from '../../../application/map/mapNavigation';
import type { V2MapToolbarProps } from './V2MapToolbar';

const KINDS: readonly LinkKind[] = ['import', 'call', 'data', 'build'];
const LABEL: Readonly<Record<LinkKind, string>> = { import: 'import', call: 'call', data: 'data', build: 'build' };
const NONE: ReadonlySet<LinkKind> = new Set();
interface Held { readonly key: string; readonly off: ReadonlySet<LinkKind>; readonly all: boolean }

/**
 * A repo map's link choices: which kinds of arrow are drawn (the Connections menu) and whether the weakest arrows of a
 * crowded level are drawn too. View state only (never the document, never undo), per lineage so it does not leak to
 * another document. `shown` and `all` go to the layout, `layers` to the Map toolbar.
 */
export function useMapLayers(model: MapModel | null, open: ReadonlySet<string>, enabled: boolean, lineage: string) {
  const [held, setHeld] = useState<Held>({ key: lineage, off: NONE, all: false });
  const now = held.key === lineage ? held : { key: lineage, off: NONE, all: false };
  const { off, all } = now;
  const toggle = useCallback((kind: LinkKind) => setHeld((was) => {
    const base = was.key === lineage ? was : { key: lineage, off: NONE, all: false };
    const next = new Set(base.off);
    if (!next.delete(kind)) next.add(kind);
    return { ...base, off: next };
  }), [lineage]);
  const toggleAll = useCallback(() => setHeld((was) => ({ ...(was.key === lineage ? was : { key: lineage, off: NONE, all: false }), all: !(was.key === lineage && was.all) })), [lineage]);
  const shown = useMemo(() => (enabled ? KINDS.filter((k) => !off.has(k)) : undefined), [enabled, off]);
  const counts = useMemo(() => (enabled && model ? edgeLayerCounts(aggregate(model, open).edges) : {}), [enabled, model, open]);
  const layers = useMemo<V2MapToolbarProps['layers']>(() => {
    const present = KINDS.filter((k) => (counts[k] ?? 0) > 0);
    // Stays up while a kind is off, so it can be switched back on.
    return present.length < 2 && !present.some((k) => off.has(k)) ? undefined : present.map((kind) => ({ kind, label: LABEL[kind], count: counts[kind] ?? 0, on: !off.has(kind) }));
  }, [counts, off]);
  return { shown, all: enabled && all, layers, toggle, toggleAll };
}
