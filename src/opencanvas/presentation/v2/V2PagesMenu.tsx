// Page switcher for the document bar: select, add, duplicate, rename, reorder,
// delete — keyboard first, one command per action (see useV2Pages).
import { useEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import { Button, Icon, IconButton, Popover, PopoverHeader, Tooltip } from '../design-system';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const activeId = pages.activePage?.id ?? null;
  useEffect(() => { if (renamingId) inputRef.current?.select(); }, [renamingId]);

  function commitRename(pageId: string): void {
    if (draft.trim()) pages.rename(pageId, draft);
    setRenamingId(null);
  }

  return (
    <Popover role="dialog" aria-label="Pages" open={open} anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <PopoverHeader title={`Pages (${pages.pages.length})`} close={<Button variant="quiet" onClick={onClose}>Done</Button>} />
      <div className="ofk-v2-pages">
        <ul className="ofk-v2-page-list" aria-label="Pages">
          {pages.pages.map((page, index) => (
            <li key={page.id} data-active={page.id === activeId || undefined}>
              {renamingId === page.id ? (
                <input ref={inputRef} className="ofk-v2-page-rename" value={draft} aria-label={`Rename ${page.name}`}
                  maxLength={80}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commitRename(page.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') { event.preventDefault(); commitRename(page.id); }
                    if (event.key === 'Escape') { event.preventDefault(); setRenamingId(null); }
                  }} />
              ) : (
                <button type="button" className="ofk-v2-page-select" aria-current={page.id === activeId || undefined}
                  onClick={() => pages.select(page.id)} onDoubleClick={() => { setDraft(page.name); setRenamingId(page.id); }}>
                  <span className="ofk-v2-page-name">{page.name}</span>
                  <span className="ofk-v2-page-count">{page.nodes.length + page.connectors.length}</span>
                </button>
              )}
              <span className="ofk-v2-page-actions">
                <Tooltip content="Move left">
                  <IconButton label={`Move ${page.name} left`} variant="quiet" disabled={index === 0 || pages.readOnly}
                    icon={<Icon icon={IconChevronLeft} />} onClick={() => pages.move(page.id, 'left')} />
                </Tooltip>
                <Tooltip content="Move right">
                  <IconButton label={`Move ${page.name} right`} variant="quiet" disabled={index === pages.pages.length - 1 || pages.readOnly}
                    icon={<Icon icon={IconChevronRight} />} onClick={() => pages.move(page.id, 'right')} />
                </Tooltip>
                <Tooltip content="Duplicate">
                  <IconButton label={`Duplicate ${page.name}`} variant="quiet" disabled={pages.readOnly}
                    icon={<Icon icon={IconCopy} />} onClick={() => pages.duplicate(page.id)} />
                </Tooltip>
                <Tooltip content={pages.pages.length === 1 ? 'A document keeps at least one page' : 'Delete'}>
                  <IconButton label={`Delete ${page.name}`} variant="quiet" disabled={pages.pages.length === 1 || pages.readOnly}
                    icon={<Icon icon={IconTrash} />} onClick={() => pages.remove(page.id)} />
                </Tooltip>
              </span>
            </li>
          ))}
        </ul>
        <Button variant="quiet" disabled={pages.readOnly} onClick={() => pages.add()}>
          <Icon icon={IconPlus} /> Add page
        </Button>
      </div>
    </Popover>
  );
}
