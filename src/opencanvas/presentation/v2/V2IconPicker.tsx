import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { ICON_PROVIDER_TABS, searchIcons } from '@/services/shapeLibrary/iconSearch';
import type { IconChoice } from '../../domain/nodes/iconNode';
import { Icon, IconButton } from '../design-system';
import './v2IconPicker.css';

interface V2IconPickerProps {
  /** Pack id + shape id of the current icon, if any; drawn selected. */
  readonly selected?: { readonly packId: string; readonly shapeId: string } | null;
  readonly onPick: (icon: IconChoice) => void;
  readonly onClose: () => void;
}

const PAGE = 160;

// One picker for "change icon" (style bar) and "add icon" (toolbar): tabs
// per pack, a search box that is focused on open, a grid that arrows walk.
// Previews are the same SVGs the canvas draws, loaded lazily per cell.
export function V2IconPicker({ selected, onPick, onClose }: V2IconPickerProps): React.JSX.Element {
  const [provider, setProvider] = useState('all');
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<IconChoice | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const result = useMemo(() => searchIcons(query, provider, PAGE), [query, provider]);
  useEffect(() => { gridRef.current?.scrollTo({ top: 0 }); }, [query, provider]);

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const cells = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const columns = Math.max(1, Math.round(event.currentTarget.clientWidth / (cells[0]?.offsetWidth || 1)));
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    cells[Math.max(0, Math.min(cells.length - 1, index + delta))]?.focus();
  };

  return (
    <div className="ofk-icon-picker" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="ofk-icon-picker-tabs" role="tablist" aria-label="Icon packs">
        {ICON_PROVIDER_TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={provider === tab.id}
            className="ofk-icon-picker-tab" onClick={() => setProvider(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <label className="ofk-icon-picker-search">
        <Icon icon={IconSearch} />
        <input type="search" value={query} data-autofocus placeholder={`Search ${provider === 'all' ? 'all' : ICON_PROVIDER_TABS.find((tab) => tab.id === provider)?.label} icons`}
          aria-label="Search icons" onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); gridRef.current?.querySelector('button')?.focus(); }
            if (event.key === 'Enter' && result.icons[0]) onPick(result.icons[0]);
          }} />
        {query ? <IconButton variant="quiet" label="Clear search" icon={<Icon icon={IconX} />} onClick={() => setQuery('')} /> : null}
      </label>
      <div ref={gridRef} className="ofk-icon-picker-grid" role="listbox" aria-label="Icons" onKeyDown={moveFocus}>
        {result.icons.map((icon) => {
          const isSelected = selected?.packId === icon.packId && selected.shapeId === icon.shapeId;
          return (
            <button key={`${icon.packId}:${icon.shapeId}`} type="button" role="option" aria-selected={isSelected}
              className="ofk-icon-picker-cell" title={icon.label} data-provider={icon.provider}
              onClick={() => onPick(icon)} onMouseEnter={() => setHovered(icon)} onFocus={() => setHovered(icon)}>
              <IconPreview icon={icon} />
            </button>
          );
        })}
        {result.total === 0 ? <p className="ofk-icon-picker-empty">No icons match “{query}”.</p> : null}
      </div>
      <footer className="ofk-icon-picker-footer">
        <span>{hovered?.label ?? (result.total > PAGE ? `Showing ${PAGE} of ${result.total}` : ' ')}</span>
        <span>{result.total.toLocaleString()} · {ICON_PROVIDER_TABS.find((tab) => tab.id === (hovered?.provider ?? provider))?.label ?? 'All'}</span>
      </footer>
    </div>
  );
}

const previewCache = new Map<string, string>();

function IconPreview({ icon }: { readonly icon: IconChoice }): React.JSX.Element {
  const key = `${icon.packId}:${icon.shapeId}`;
  const [url, setUrl] = useState<string | null>(previewCache.get(key) ?? null);
  useEffect(() => {
    if (url) return;
    let alive = true;
    void loadProviderShapePreview(icon.packId, icon.shapeId).then((preview) => {
      if (!alive || !preview?.previewUrl) return;
      previewCache.set(key, preview.previewUrl);
      setUrl(preview.previewUrl);
    });
    return () => { alive = false; };
  }, [icon.packId, icon.shapeId, key, url]);
  return url ? <img src={url} alt="" loading="lazy" draggable={false} /> : <span className="ofk-icon-picker-skeleton" />;
}
