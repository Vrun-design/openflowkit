import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { CLOUD_PROVIDERS, ICON_PACKS, iconCounts, packLabel, searchIcons } from '@/services/shapeLibrary/iconSearch';
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
/** Browse view (no query): this many per provider before "Show all". */
const GROUP_PREVIEW = 42;
const RECENT_KEY = 'ofk.recentIcons';
const RECENT_LIMIT = 14;

// Per-viewer convenience only: the last icons picked on this browser.
function readRecent(): IconChoice[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as IconChoice[]).filter((icon) => typeof icon?.shapeId === 'string') : [];
  } catch { return []; }
}
function rememberRecent(icon: IconChoice): void {
  try {
    const next = [icon, ...readRecent().filter((item) => item.packId !== icon.packId || item.shapeId !== icon.shapeId)];
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_LIMIT)));
  } catch { /* private window or blocked storage: no recents */ }
}

// One picker for "change icon" (style bar) and "add icon" (toolbar). Tabs
// per pack (Cloud nests its vendors), a search box focused on open, a grid
// arrows can walk. Browsing shows provider groups with counts; searching
// shows one ranked list. Previews are the SVGs the canvas draws.
export function V2IconPicker({ selected, onPick, onClose }: V2IconPickerProps): React.JSX.Element {
  const [pack, setPack] = useState('all');
  const [vendor, setVendor] = useState('cloud');
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState<IconChoice | null>(null);
  const [recent, setRecent] = useState<IconChoice[]>(readRecent);
  const gridRef = useRef<HTMLDivElement>(null);
  const scope = pack === 'cloud' ? vendor : pack;
  const q = query.trim();
  const result = useMemo(() => searchIcons(q, scope, PAGE), [q, scope]);
  const groups = useMemo(() => (q ? [] : iconCounts(scope).map(({ provider, total }) => ({
    provider, total, icons: searchIcons('', provider, GROUP_PREVIEW).icons,
  }))), [q, scope]);
  useEffect(() => { gridRef.current?.scrollTo({ top: 0 }); }, [q, scope]);

  const pick = (icon: IconChoice) => { rememberRecent(icon); setRecent(readRecent()); onPick(icon); };
  const showAll = (provider: string) => {
    if (CLOUD_PROVIDERS.some((cloud) => cloud.id === provider)) { setPack('cloud'); setVendor(provider); } else setPack(provider);
  };
  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const cells = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    const columns = Math.max(1, Math.round(event.currentTarget.clientWidth / (cells[0]?.offsetWidth || 1)));
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    cells[Math.max(0, Math.min(cells.length - 1, index + delta))]?.focus();
  };
  const cell = (icon: IconChoice) => (
    <button key={`${icon.packId}:${icon.shapeId}`} type="button" role="option"
      aria-selected={selected?.packId === icon.packId && selected.shapeId === icon.shapeId}
      className="ofk-icon-picker-cell" title={icon.label} data-provider={icon.provider}
      onClick={() => pick(icon)} onMouseEnter={() => setHovered(icon)} onFocus={() => setHovered(icon)}>
      <IconPreview icon={icon} />
    </button>
  );
  const tab = (id: string, label: string, current: string, set: (id: string) => void) => (
    <button key={id} type="button" role="tab" aria-selected={current === id} className="ofk-icon-picker-tab" onClick={() => set(id)}>{label}</button>
  );

  return (
    <div className="ofk-icon-picker" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <header className="ofk-icon-picker-head">
        <div className="ofk-icon-picker-tabs" role="tablist" aria-label="Icon packs">
          {tab('all', 'All', pack, setPack)}
          {ICON_PACKS.map((item) => tab(item.id, item.label, pack, setPack))}
        </div>
        <IconButton variant="quiet" label="Close icons" icon={<Icon icon={IconX} />} onClick={onClose} />
      </header>
      {pack === 'cloud' ? (
        <div className="ofk-icon-picker-tabs ofk-icon-picker-tabs--sub" role="tablist" aria-label="Cloud providers">
          {tab('cloud', 'All', vendor, setVendor)}
          {CLOUD_PROVIDERS.map((item) => tab(item.id, item.label, vendor, setVendor))}
        </div>
      ) : null}
      <label className="ofk-icon-picker-search">
        <Icon icon={IconSearch} />
        <input type="search" value={query} data-autofocus placeholder={`Search ${scope === 'all' ? 'all' : packLabel(scope)} icons`}
          aria-label="Search icons" onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); gridRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus(); }
            if (event.key === 'Enter' && result.icons[0]) pick(result.icons[0]);
          }} />
        {query ? <IconButton variant="quiet" label="Clear search" icon={<Icon icon={IconX} />} onClick={() => setQuery('')} /> : null}
      </label>
      <div ref={gridRef} className="ofk-icon-picker-body" onKeyDown={moveFocus}>
        {q ? (
          <div className="ofk-icon-picker-grid" role="listbox" aria-label="Icons">
            {result.icons.map(cell)}
            {result.total === 0 ? <p className="ofk-icon-picker-empty">No icons match “{q}”.</p> : null}
          </div>
        ) : (
          <>
            {pack === 'all' && recent.length ? (
              <section className="ofk-icon-picker-group">
                <h3 className="ofk-caption">Recent <span>{recent.length}</span></h3>
                <div className="ofk-icon-picker-grid" role="listbox" aria-label="Recent icons">{recent.map(cell)}</div>
              </section>
            ) : null}
            {groups.map((group) => (
              <section key={group.provider} className="ofk-icon-picker-group">
                <h3 className="ofk-caption">
                  {packLabel(group.provider)} <span>{group.total.toLocaleString()}</span>
                  {groups.length > 1 && group.total > group.icons.length
                    ? <button type="button" className="ofk-icon-picker-more" onClick={() => showAll(group.provider)}>Show all</button> : null}
                </h3>
                <div className="ofk-icon-picker-grid" role="listbox" aria-label={`${packLabel(group.provider)} icons`}>
                  {(groups.length > 1 ? group.icons : searchIcons('', group.provider, PAGE).icons).map(cell)}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
      <footer className="ofk-icon-picker-footer">
        <span>{hovered?.label ?? (q && result.total > PAGE ? `Showing ${PAGE} of ${result.total.toLocaleString()}` : ' ')}</span>
        <span>{hovered ? packLabel(hovered.provider) : `${result.total.toLocaleString()} icons`}</span>
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
