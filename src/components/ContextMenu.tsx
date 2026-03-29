import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Copy,
  ClipboardPaste,
  Trash2,
  BringToFront,
  SendToBack,
  CopyPlus,
  Replace,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Group,
  Pencil,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Maximize2,
  FolderInput,
  ArrowUpRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VIEWPORT_PADDING = 12;
const MENU_BUTTON_CLASS_NAME =
  'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]';
const COMPACT_MENU_BUTTON_CLASS_NAME =
  'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]';
const DANGER_MENU_BUTTON_CLASS_NAME =
  'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50';
const GROUP_MENU_BUTTON_CLASS_NAME =
  'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50';
const DIVIDER_CLASS_NAME = 'h-px bg-[var(--color-brand-border)] my-1';
const SOFT_DIVIDER_CLASS_NAME = 'h-px bg-[var(--color-brand-border)] my-0.5';
const SECTION_LABEL_CLASS_NAME =
  'px-3 py-1 text-[10px] font-semibold text-[var(--brand-secondary)] uppercase';
const SELECTION_COUNT_CLASS_NAME =
  'px-3 py-1.5 text-[10px] font-bold text-[var(--brand-secondary)] uppercase tracking-wider';
const ICON_GRID_BUTTON_CLASS_NAME =
  'flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getContextMenuPosition(input: {
  position: { x: number; y: number };
  menuRect: Pick<DOMRect, 'width' | 'height'>;
  viewport: { width: number; height: number };
}): { x: number; y: number } {
  const maxLeft = input.viewport.width - input.menuRect.width - VIEWPORT_PADDING;
  const maxTop = input.viewport.height - input.menuRect.height - VIEWPORT_PADDING;

  return {
    x: clamp(input.position.x, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, maxLeft)),
    y: clamp(input.position.y, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, maxTop)),
  };
}

export interface ContextMenuProps {
  id: string | null;
  type: 'node' | 'pane' | 'edge' | 'multi';
  currentNodeType?: string | null;
  onChangeNodeType?: (type: string) => void;
  isSectionLocked?: boolean;
  isSectionHidden?: boolean;
  hasParentSection?: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onEditLabel?: () => void;
  onFitSectionToContents?: () => void;
  onBringContentsIntoSection?: () => void;
  onReleaseFromSection?: () => void;
  onToggleSectionLock?: () => void;
  onToggleSectionHidden?: () => void;
  canPaste?: boolean;
  // Multi-select
  selectedCount?: number;
  onAlignNodes?: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistributeNodes?: (direction: 'horizontal' | 'vertical') => void;
  onGroupSelected?: () => void;
  onWrapInSection?: () => void;
}

export function ContextMenu({
  type,
  currentNodeType,
  isSectionLocked = false,
  isSectionHidden = false,
  hasParentSection = false,
  position,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onEditLabel,
  onFitSectionToContents,
  onBringContentsIntoSection,
  onReleaseFromSection,
  onToggleSectionLock,
  onToggleSectionHidden,
  canPaste,
  selectedCount = 0,
  onAlignNodes,
  onDistributeNodes,
  onGroupSelected,
  onWrapInSection,
}: ContextMenuProps): React.ReactElement {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    setMenuPosition(position);
  }, [position]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const nextPosition = getContextMenuPosition({
      position,
      menuRect: rect,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });

    if (nextPosition.x !== menuPosition.x || nextPosition.y !== menuPosition.y) {
      setMenuPosition(nextPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuPosition.x, menuPosition.y, position.x, position.y, type]);

  return (
    <div
      ref={menuRef}
      style={{ top: menuPosition.y, left: menuPosition.x }}
      className="fixed z-50 flex min-w-[200px] max-w-[min(280px,calc(100vw-24px))] flex-col gap-0.5 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-1.5 shadow-[var(--shadow-md)] animate-in fade-in zoom-in-95 duration-100"
    >
      {type === 'node' && (
        <>
          <button
            onClick={onCopy}
            className={MENU_BUTTON_CLASS_NAME}
          >
            <Copy className="w-4 h-4" /> {t('common.copy')}
          </button>
          <button
            onClick={onDuplicate}
            className={MENU_BUTTON_CLASS_NAME}
          >
            <CopyPlus className="w-4 h-4" /> {t('common.duplicate')}
          </button>

          {currentNodeType === 'section' || hasParentSection ? (
            <>
              <div className={DIVIDER_CLASS_NAME} />
              {currentNodeType === 'section' && onFitSectionToContents ? (
                <button
                  onClick={onFitSectionToContents}
                  className={MENU_BUTTON_CLASS_NAME}
                >
                  <Maximize2 className="w-4 h-4" /> Fit Contents
                </button>
              ) : null}
              {currentNodeType === 'section' && onBringContentsIntoSection ? (
                <button
                  onClick={onBringContentsIntoSection}
                  className={MENU_BUTTON_CLASS_NAME}
                >
                  <FolderInput className="w-4 h-4" /> Bring Inside
                </button>
              ) : null}
              {hasParentSection && onReleaseFromSection ? (
                <button
                  onClick={onReleaseFromSection}
                  className={MENU_BUTTON_CLASS_NAME}
                >
                  <ArrowUpRight className="w-4 h-4" /> Release From Section
                </button>
              ) : null}
              {currentNodeType === 'section' && onToggleSectionLock ? (
                <button
                  onClick={onToggleSectionLock}
                  className={MENU_BUTTON_CLASS_NAME}
                >
                  {isSectionLocked ? (
                    <LockOpen className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isSectionLocked ? 'Unlock Section' : 'Lock Section'}
                </button>
              ) : null}
              {currentNodeType === 'section' && onToggleSectionHidden ? (
                <button
                  onClick={onToggleSectionHidden}
                  className={MENU_BUTTON_CLASS_NAME}
                >
                  {isSectionHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isSectionHidden ? 'Show Section' : 'Hide Section'}
                </button>
              ) : null}
            </>
          ) : null}

          <div className={DIVIDER_CLASS_NAME} />

          <button
            onClick={onBringToFront}
            className={MENU_BUTTON_CLASS_NAME}
          >
            <BringToFront className="w-4 h-4" /> {t('common.bringToFront')}
          </button>
          <button
            onClick={onSendToBack}
            className={MENU_BUTTON_CLASS_NAME}
          >
            <SendToBack className="w-4 h-4" /> {t('common.sendToBack')}
          </button>

          <div className={DIVIDER_CLASS_NAME} />

          <button
            onClick={onDelete}
            className={DANGER_MENU_BUTTON_CLASS_NAME}
          >
            <Trash2 className="w-4 h-4" /> {t('common.delete')}
          </button>
        </>
      )}

      {type === 'pane' && (
        <>
          <button
            onClick={onPaste}
            disabled={!canPaste}
            className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors ${!canPaste ? 'cursor-not-allowed text-[var(--brand-secondary)]' : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'}`}
          >
            <ClipboardPaste className="w-4 h-4" /> {t('common.paste')}
          </button>
        </>
      )}

      {type === 'edge' && (
        <>
          {onEditLabel && (
            <button
              onClick={onEditLabel}
              className={MENU_BUTTON_CLASS_NAME}
            >
              <Pencil className="w-4 h-4" /> {t('common.editLabel')}
            </button>
          )}
          <button
            onClick={onDuplicate}
            className={MENU_BUTTON_CLASS_NAME}
          >
            <Replace className="w-4 h-4" /> {t('common.reverseDirection')}
          </button>
          <div className={DIVIDER_CLASS_NAME} />
          <button
            onClick={onDelete}
            className={DANGER_MENU_BUTTON_CLASS_NAME}
          >
            <Trash2 className="w-4 h-4" /> {t('common.deleteConnection')}
          </button>
        </>
      )}

      {type === 'multi' && (
        <>
          <div className={SELECTION_COUNT_CLASS_NAME}>
            {t('common.itemsSelected', { count: selectedCount })}
          </div>

          {onAlignNodes && (
            <>
              <div className={SECTION_LABEL_CLASS_NAME}>
                {t('common.align')}
              </div>
              <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
                <button
                  onClick={() => onAlignNodes('left')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignLeft')}
                >
                  <AlignStartVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('center')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignCenter')}
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('right')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignRight')}
                >
                  <AlignEndVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('top')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignTop')}
                >
                  <AlignStartHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('middle')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignMiddle')}
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('bottom')}
                  className={ICON_GRID_BUTTON_CLASS_NAME}
                  title={t('common.alignBottom')}
                >
                  <AlignEndHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {onDistributeNodes && (
            <>
              <div className={SOFT_DIVIDER_CLASS_NAME} />
              <div className={SECTION_LABEL_CLASS_NAME}>
                {t('common.distribute')}
              </div>
              <button
                onClick={() => onDistributeNodes('horizontal')}
                className={COMPACT_MENU_BUTTON_CLASS_NAME}
              >
                <ArrowRightFromLine className="w-4 h-4" /> {t('common.distributeHorizontally')}
              </button>
              <button
                onClick={() => onDistributeNodes('vertical')}
                className={COMPACT_MENU_BUTTON_CLASS_NAME}
              >
                <ArrowDownFromLine className="w-4 h-4" /> {t('common.distributeVertically')}
              </button>
            </>
          )}

          {onGroupSelected && (
            <>
              <div className={SOFT_DIVIDER_CLASS_NAME} />
              <button
                onClick={onGroupSelected}
                className={GROUP_MENU_BUTTON_CLASS_NAME}
              >
                <Group className="w-4 h-4" /> {t('common.group')}
              </button>
            </>
          )}

          {onWrapInSection && (
            <>
              <div className={SOFT_DIVIDER_CLASS_NAME} />
              <button
                onClick={onWrapInSection}
                className={GROUP_MENU_BUTTON_CLASS_NAME}
              >
                <Maximize2 className="w-4 h-4" /> Wrap in Section
              </button>
            </>
          )}

          <div className={SOFT_DIVIDER_CLASS_NAME} />
          <button
            onClick={onDelete}
            className={DANGER_MENU_BUTTON_CLASS_NAME}
          >
            <Trash2 className="w-4 h-4" /> {t('common.delete')} ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
}
