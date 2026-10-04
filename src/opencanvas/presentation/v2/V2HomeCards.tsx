import { useId, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  IconAlertTriangle, IconArrowBackUp, IconCheck, IconCircleCheck, IconCode, IconCopy, IconDots, IconExternalLink, IconHierarchy2,
  IconInfoCircle, IconPencil, IconPlug, IconSparkles, IconSquare, IconArchive, IconStar, IconStarFilled, IconTrashX, IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { Icon, IconButton, Menu, MenuItem, MenuSeparator, Skeleton, Tooltip, type IconComponent } from '../design-system';
import type { HomeNotice } from './V2LegacyRoutes';
import type { V2DocumentSummary, V2Thumbnail } from '../../../services/storage/v2/v2Repository';
import { savedWhen } from './homeFormat';

export type StartKind = 'blank' | 'assistant' | 'code' | 'agent';

/** Small looping illustrations, one per way to start; decorative, still under reduced motion. */
function StartHero({ kind }: { readonly kind: StartKind }): React.JSX.Element {
  return (
    <svg className="ofk-home-start-hero" data-kind={kind} viewBox="0 0 120 64" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'blank' ? <>
        <g className="ofk-home-dots">{[20, 44, 68, 92].flatMap((x) => [16, 32, 48].map((y) => <circle key={`${x}-${y}`} cx={x + 4} cy={y} r=".9" />))}</g>
        <rect className="ofk-home-draw" x="34" y="18" width="52" height="28" rx="6" pathLength="1" />
        <path className="ofk-home-cursor" d="M0 0 L0 11 L3 8 L6 13 L8 12 L5 7 L9 7 Z" />
      </> : kind === 'assistant' ? <>
        <path className="ofk-home-spark" d="M18 22 Q19 30 26 31 Q19 32 18 40 Q17 32 10 31 Q17 30 18 22 Z" />
        <rect className="ofk-home-pop ofk-home-pop-1" x="42" y="12" width="26" height="14" rx="4" />
        <rect className="ofk-home-pop ofk-home-pop-2" x="42" y="38" width="26" height="14" rx="4" />
        <rect className="ofk-home-pop ofk-home-pop-3" x="84" y="25" width="26" height="14" rx="4" />
        <path className="ofk-home-link ofk-home-link-1" d="M68 19 C76 19 76 32 84 32" pathLength="1" />
        <path className="ofk-home-link ofk-home-link-2" d="M68 45 C76 45 76 32 84 32" pathLength="1" />
      </> : kind === 'code' ? <>
        <path d="M14 16 L8 22 L14 28" /><path d="M30 16 L36 22 L30 28" />
        <rect className="ofk-home-type ofk-home-type-1" x="8" y="36" width="34" height="3" rx="1.5" />
        <rect className="ofk-home-type ofk-home-type-2" x="8" y="44" width="24" height="3" rx="1.5" />
        <rect className="ofk-home-type ofk-home-type-3" x="8" y="52" width="30" height="3" rx="1.5" />
        <path className="ofk-home-arrow" d="M50 32 H62 M58 28 L62 32 L58 36" />
        <rect className="ofk-home-pop ofk-home-pop-1" x="72" y="12" width="36" height="14" rx="4" />
        <rect className="ofk-home-pop ofk-home-pop-2" x="72" y="38" width="36" height="14" rx="4" />
        <path className="ofk-home-link ofk-home-link-1" d="M90 26 V38" pathLength="1" />
      </> : <>
        <rect x="6" y="20" width="34" height="24" rx="5" />
        <path d="M13 29 L17 32 L13 35 M20 36 H26" />
        <rect className="ofk-home-accent" x="80" y="20" width="34" height="24" rx="5" />
        <path className="ofk-home-accent" d="M89 37 L95 27 L101 37 Z" />
        <g className="ofk-home-flow"><circle cx="50" cy="32" r="2" /><circle cx="60" cy="32" r="2" /><circle cx="70" cy="32" r="2" /></g>
      </>}
    </svg>
  );
}

/** One way to start: a button with a moving picture of what it does. */
export function StartCard({ kind, title, text, onStart }: {
  readonly kind: StartKind;
  readonly title: string;
  readonly text: string;
  readonly onStart: () => void;
}): React.JSX.Element {
  return (
    <li className="ofk-home-start">
      <button type="button" className="ofk-home-start-button" onClick={onStart}>
        <span className="ofk-home-start-art"><StartHero kind={kind} /></span>
        <span className="ofk-home-start-title">{title}</span>
        <span className="ofk-home-start-text">{text}</span>
      </button>
    </li>
  );
}

export const CHIP_ICON: Record<StartKind, IconComponent> = { blank: IconSquare, assistant: IconSparkles, code: IconCode, agent: IconPlug };

/** A way to start once there are diagrams: one quiet row, not four posters. */
export function StartChip({ kind, title, hint, onStart }: {
  readonly kind: StartKind;
  readonly title: string;
  readonly hint: string;
  readonly onStart: () => void;
}): React.JSX.Element {
  return (
    <li>
      <button type="button" className="ofk-home-chip" data-kind={kind} onClick={onStart}>
        <span className="ofk-home-chip-icon"><Icon icon={CHIP_ICON[kind]} /></span>
        <span className="ofk-home-chip-text"><span>{title}</span><span className="ofk-home-chip-hint">{hint}</span></span>
      </button>
    </li>
  );
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A diagram's first page in the current theme, or a quiet placeholder. */
export function DiagramPreview({ thumbnail, appearance }: {
  readonly thumbnail: V2Thumbnail | null | undefined;
  readonly appearance: 'light' | 'dark';
}): React.JSX.Element {
  const src = useMemo(() => (thumbnail ? svgUrl(thumbnail[appearance]) : null), [thumbnail, appearance]);
  if (src) return <img className="ofk-home-preview-image" src={src} alt="" decoding="async" />;
  // Nothing drawn yet, or too big to keep: an empty canvas, not a monogram.
  return <span className="ofk-home-placeholder" aria-hidden="true"><Icon icon={IconHierarchy2} /></span>;
}

/** Multi-select on a card: a checkbox on hover, and ⌘/Ctrl- or Shift-click (any click once something is selected). */
export interface CardSelection {
  readonly selected: boolean;
  /** Something is selected, so a plain click selects instead of opening. */
  readonly active: boolean;
  readonly onToggle: (range: boolean) => void;
}

/**
 * A card: preview on top, title and meta below. The whole card is one target
 * (a link or a button stretched over it); checkbox, star and menu sit above it.
 */
export function HomeCard({ preview, title, meta, to, onOpen, menu, star, editing, docId, selection, onContextMenu }: {
  readonly preview: ReactNode;
  readonly title: string;
  readonly meta?: ReactNode;
  readonly to?: string;
  readonly onOpen?: () => void;
  readonly menu?: ReactNode;
  /** Star toggle, above the target like the menu. */
  readonly star?: ReactNode;
  /** Replaces the title while renaming. */
  readonly editing?: ReactNode;
  readonly docId?: string;
  readonly selection?: CardSelection;
  readonly onContextMenu?: (event: MouseEvent<HTMLLIElement>) => void;
}): React.JSX.Element {
  const metaId = useId();
  const label = <span className="ofk-home-card-title">{title}</span>;
  const describedBy = meta ? metaId : undefined;
  const select = (event: MouseEvent) => {
    if (!selection || !(event.metaKey || event.ctrlKey || event.shiftKey || selection.active)) return;
    event.preventDefault();
    selection.onToggle(event.shiftKey);
  };
  return (
    <li className="ofk-home-card" data-editing={editing ? '' : undefined} data-selected={selection?.selected || undefined}
      data-selecting={selection?.active || undefined} onContextMenu={onContextMenu}>
      <div className="ofk-home-preview">{preview}</div>
      <div className="ofk-home-card-body">
        {editing ?? (to
          ? <Link className="ofk-home-card-hit" to={to} data-doc-id={docId} aria-describedby={describedBy} onClick={select}>{label}</Link>
          : <button type="button" className="ofk-home-card-hit" data-doc-id={docId} aria-describedby={describedBy}
            onClick={(event) => { select(event); if (!event.defaultPrevented) onOpen?.(); }}>{label}</button>)}
        {meta ? <span className="ofk-home-card-meta" id={metaId}>{meta}</span> : null}
      </div>
      {selection && !editing ? (
        <button type="button" role="checkbox" aria-checked={selection.selected} aria-label={`Select ${title}`}
          className="ofk-home-select" onClick={(event) => selection.onToggle(event.shiftKey)}>
          <Icon icon={IconCheck} />
        </button>
      ) : null}
      {star || menu ? <div className="ofk-home-card-actions">{star}{menu}</div> : null}
    </li>
  );
}

/** A card's menu, from its ⋯ button or a right-click (opened at the pointer). Keyboard-first via the design-system Menu. */
function CardMenu({ name, open, at, onOpenChange, children }: {
  readonly name: string;
  readonly open: boolean;
  /** Where a right-click opened it; null anchors it to the ⋯ button. */
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly children: ReactNode;
}): React.JSX.Element {
  const button = useRef<HTMLButtonElement>(null);
  const point = useRef<HTMLSpanElement>(null);
  return (
    <>
      <Tooltip content="More">
        <IconButton ref={button} variant="quiet" label={`More actions for ${name}`} icon={<Icon icon={IconDots} />}
          aria-haspopup="menu" aria-expanded={open} onClick={() => onOpenChange(!open)} />
      </Tooltip>
      {/* A zero-size anchor at the pointer, in the body so no card transform can offset it. */}
      {open && at ? createPortal(<span ref={point} className="ofk-home-menu-point" style={{ left: at.x, top: at.y }} />, document.body) : null}
      <Menu open={open} anchorRef={at ? point : button} onClose={() => onOpenChange(false)} label={`${name} actions`}
        placement={at ? 'bottom-start' : 'bottom-end'}>
        {children}
      </Menu>
    </>
  );
}

/** Menu state for a card: the ⋯ button, or a right-click at the pointer (Shift+F10 / the menu key anchors to ⋯). */
function useCardMenu() {
  const [menu, setMenu] = useState<{ open: boolean; at: { x: number; y: number } | null }>({ open: false, at: null });
  const onContextMenu = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('input')) return;
    event.preventDefault();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    setMenu({ open: true, at: fromKeyboard ? null : { x: event.clientX, y: event.clientY } });
  };
  return { menu, onContextMenu, onOpenChange: (open: boolean) => setMenu({ open, at: open ? menu.at : null }) };
}

export interface DiagramActions {
  readonly starred: boolean;
  readonly onStar: () => void;
  readonly onRename: () => void;
  readonly onDuplicate: () => void;
  readonly onArchive: () => void;
}

/** One of your diagrams: preview, name, when, pages, v1 tag; star, rename in place, duplicate, archive. */
export function DiagramCard({ summary, thumbnail, appearance, rename, renameRef, actions, selection }: {
  readonly summary: V2DocumentSummary;
  readonly thumbnail: V2Thumbnail | null | undefined;
  readonly appearance: 'light' | 'dark';
  readonly rename: {
    readonly draft: string;
    readonly onChange: (draft: string) => void;
    readonly onCommit: () => void;
    readonly onCancel: () => void;
  } | null;
  readonly renameRef: RefObject<HTMLInputElement | null>;
  readonly actions: DiagramActions;
  readonly selection: CardSelection;
}): React.JSX.Element {
  const when = savedWhen(summary.savedAt);
  const { menu, onContextMenu, onOpenChange } = useCardMenu();
  return (
    <HomeCard docId={summary.id} to={`/d/${summary.id}`} title={summary.name} selection={selection} onContextMenu={onContextMenu}
      preview={<DiagramPreview thumbnail={thumbnail} appearance={appearance} />}
      meta={<>
        <time dateTime={summary.savedAt} title={when.absolute}>{when.relative}</time>
        {summary.pageCount > 1 ? <span>{summary.pageCount} pages</span> : null}
        {summary.id.startsWith('v1-') ? <span className="ofk-home-tag">From v1</span> : null}
      </>}
      editing={rename ? (
        <input ref={renameRef} className="ofk-home-rename" aria-label={`Rename ${summary.name}`} maxLength={120}
          value={rename.draft} onChange={(event) => rename.onChange(event.target.value)} onBlur={rename.onCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') { event.preventDefault(); rename.onCancel(); }
          }} />
      ) : undefined}
      star={<StarToggle name={summary.name} starred={actions.starred} onToggle={actions.onStar} />}
      menu={
        <CardMenu name={summary.name} open={menu.open} at={menu.at} onOpenChange={onOpenChange}>
          <MenuItem icon={<Icon icon={IconExternalLink} />} onSelect={() => window.open(`#/d/${summary.id}`, '_blank', 'noopener')}>
            Open in new tab
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon icon={IconPencil} />} shortcut="F2" onSelect={actions.onRename}>Rename</MenuItem>
          <MenuItem icon={<Icon icon={IconCopy} />} onSelect={actions.onDuplicate}>Duplicate</MenuItem>
          <MenuItem icon={<Icon icon={actions.starred ? IconStarFilled : IconStar} />} shortcut="S" onSelect={actions.onStar}>
            {actions.starred ? 'Unstar' : 'Star'}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon icon={IconArchive} />} shortcut="Del" onSelect={actions.onArchive}>Archive</MenuItem>
        </CardMenu>
      } />
  );
}

/** An archived diagram: no link (an edit would quietly bring it back); restore it or delete it for good. */
export function ArchivedCard({ summary, thumbnail, appearance, selection, onRestore, onDelete }: {
  readonly summary: V2DocumentSummary;
  readonly thumbnail: V2Thumbnail | null | undefined;
  readonly appearance: 'light' | 'dark';
  readonly selection: CardSelection;
  readonly onRestore: () => void;
  readonly onDelete: () => void;
}): React.JSX.Element {
  const when = savedWhen(summary.archivedAt ?? summary.savedAt);
  const { menu, onContextMenu, onOpenChange } = useCardMenu();
  return (
    <HomeCard docId={summary.id} title={summary.name} selection={selection} onContextMenu={onContextMenu}
      onOpen={() => selection.onToggle(false)}
      preview={<DiagramPreview thumbnail={thumbnail} appearance={appearance} />}
      meta={<>
        <time dateTime={summary.archivedAt} title={when.absolute}>Archived {when.relative}</time>
      </>}
      menu={
        <CardMenu name={summary.name} open={menu.open} at={menu.at} onOpenChange={onOpenChange}>
          <MenuItem icon={<Icon icon={IconArrowBackUp} />} onSelect={onRestore}>Restore</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon icon={IconTrashX} />} danger onSelect={onDelete}>Delete forever…</MenuItem>
        </CardMenu>
      } />
  );
}

export function SkeletonCard(): React.JSX.Element {
  return (
    <li className="ofk-home-card" aria-hidden="true">
      <div className="ofk-home-preview"><Skeleton height="100%" radius={0} /></div>
      <div className="ofk-home-card-body"><Skeleton width="62%" height={13} /><Skeleton width="38%" height={11} /></div>
    </li>
  );
}

const NOTICE_ICON = { info: IconInfoCircle, success: IconCircleCheck, warning: IconAlertTriangle, danger: IconAlertTriangle } as const;

/** Star on a card: shown on hover, kept visible once starred. */
function StarToggle({ name, starred, onToggle }: { readonly name: string; readonly starred: boolean; readonly onToggle: () => void }): React.JSX.Element {
  return (
    <Tooltip content={starred ? 'Unstar' : 'Star'}>
      <IconButton variant="quiet" className="ofk-home-star" data-on={starred || undefined} selected={starred}
        label={`Star ${name}`} icon={<Icon icon={starred ? IconStarFilled : IconStar} />} onClick={onToggle} />
    </Tooltip>
  );
}

/** One-line notice above the list; failures interrupt (alert), everything else waits its turn (status). */
export function HomeNoticeStrip({ notice, onDismiss }: { readonly notice: HomeNotice; readonly onDismiss: () => void }): React.JSX.Element {
  return (
    <div className="ofk-home-notice" data-tone={notice.tone} role={notice.tone === 'danger' ? 'alert' : 'status'}>
      <Icon icon={NOTICE_ICON[notice.tone]} />
      <p><strong>{notice.notice}</strong>{notice.detail ? ` ${notice.detail}` : ''}</p>
      <IconButton variant="quiet" label="Dismiss" icon={<Icon icon={IconX} />} onClick={onDismiss} />
    </div>
  );
}
