import { useEffect, useRef, useState } from 'react';
import { IconArrowDown, IconArrowUp, IconCheck, IconCopy, IconDots, IconFile, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { Button, Icon, IconButton, Menu, MenuItem, MenuSeparator, Popover } from '../design-system';
import type { useV2Pages } from './useV2Pages';

type PagesApi = ReturnType<typeof useV2Pages>;
export interface V2PagesMenuProps {
  readonly pages: PagesApi;
  readonly open: boolean;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly onClose: () => void;
}

export function V2PagesMenu({ pages, open, anchorRef, onClose }: V2PagesMenuProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const actionAnchor = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);
  const actionPage = pages.pages.find((page) => page.id === actionId);
  const actionIndex = pages.pages.findIndex((page) => page.id === actionId);
  useEffect(() => { if (renamingId) { inputRef.current?.focus(); inputRef.current?.select(); } }, [renamingId]);
  // Reset transient state on close during render (React's derived-state
  // pattern), not in an effect, so the closed popover never paints stale rows.
  if (!open && (actionId !== null || renamingId !== null)) { setActionId(null); setRenamingId(null); }
  function rename(id: string, name: string): void {
    if (pages.readOnly) return;
    cancelled.current = false;
    setDraft(name);
    setRenamingId(id);
  }
  function commitRename(id: string): void {
    if (!cancelled.current && draft.trim()) pages.rename(id, draft);
    setRenamingId(null);
  }
  return <Popover role="dialog" aria-label="Pages" className="ofk-pages-popover" open={open} anchorRef={anchorRef} onClose={onClose} placement="bottom-start"
    onEscapeKeyDown={(event) => {
      if (!renamingId) return;
      event.preventDefault(); event.stopPropagation(); cancelled.current = true;
      setRenamingId(null); actionAnchor.current?.focus();
    }}>
    <header className="ofk-utility-header"><h2>Pages <span>{pages.pages.length}</span></h2>
      <IconButton variant="quiet" label="Close pages" icon={<Icon icon={IconX} />} onClick={onClose} />
    </header>
    <ul className="ofk-page-rows" aria-label="Pages">
      {pages.pages.map((page) => <li key={page.id} data-active={page.id === pages.activePage?.id || undefined}
        onContextMenu={(event) => { event.preventDefault(); actionAnchor.current = event.currentTarget; setActionId(page.id); }}>
        {renamingId === page.id ? <input ref={inputRef} className="ofk-v2-page-rename" value={draft} aria-label={`Rename ${page.name}`} maxLength={80}
          onChange={(event) => setDraft(event.target.value)} onBlur={() => commitRename(page.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); commitRename(page.id); }
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelled.current = true; setRenamingId(null); }
          }} /> : <button type="button" className="ofk-v2-page-select" aria-current={page.id === pages.activePage?.id ? 'page' : undefined}
          onClick={() => pages.select(page.id)} onDoubleClick={() => rename(page.id, page.name)}>
          <Icon icon={IconFile} /><span className="ofk-v2-page-name">{page.name}</span>
          {page.id === pages.activePage?.id ? <Icon icon={IconCheck} /> : null}
        </button>}
        <IconButton variant="quiet" label={`Actions for ${page.name}`} aria-haspopup="menu" aria-expanded={actionId === page.id}
          icon={<Icon icon={IconDots} />} onClick={(event) => { actionAnchor.current = event.currentTarget; setActionId(page.id); }} />
      </li>)}
    </ul>
    <footer className="ofk-pages-footer"><Button variant="quiet" disabled={pages.readOnly} onClick={pages.add}><Icon icon={IconPlus} /> Add page</Button></footer>
    <Menu open={!!actionPage} anchorRef={actionAnchor} onClose={() => setActionId(null)} label="Page actions" placement="right-start">
      {actionPage ? <>
        <MenuItem icon={<Icon icon={IconPencil} />} disabled={pages.readOnly} onSelect={() => rename(actionPage.id, actionPage.name)}>Rename</MenuItem>
        <MenuItem icon={<Icon icon={IconCopy} />} disabled={pages.readOnly} onSelect={() => pages.duplicate(actionPage.id)}>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Icon icon={IconArrowUp} />} disabled={pages.readOnly || actionIndex === 0} onSelect={() => pages.move(actionPage.id, 'left')}>Move up</MenuItem>
        <MenuItem icon={<Icon icon={IconArrowDown} />} disabled={pages.readOnly || actionIndex === pages.pages.length - 1} onSelect={() => pages.move(actionPage.id, 'right')}>Move down</MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Icon icon={IconTrash} />} disabled={pages.readOnly || pages.pages.length === 1} danger onSelect={() => pages.remove(actionPage.id)}>Delete page</MenuItem>
      </> : null}
    </Menu>
  </Popover>;
}
