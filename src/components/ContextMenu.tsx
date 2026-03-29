import React, { useEffect, useRef } from 'react';
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

export interface ContextMenuProps {
  id: string | null;
  type: 'node' | 'pane' | 'edge' | 'multi';
  currentNodeType?: string | null;
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
  onChangeNodeType?: (type: string) => void;
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
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
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
  onChangeNodeType,
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
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const nodeTypeOptions = [
    { id: 'process', label: 'Process' },
    { id: 'decision', label: 'Decision' },
    { id: 'annotation', label: 'Note' },
    { id: 'journey', label: 'Journey' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'class', label: 'Class' },
    { id: 'er_entity', label: 'Entity' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="absolute z-50 flex min-w-[200px] flex-col gap-0.5 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-1.5 shadow-[var(--shadow-md)] animate-in fade-in zoom-in-95 duration-100"
    >
      {type === 'node' && (
        <>
          <button
            onClick={onCopy}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
          >
            <Copy className="w-4 h-4" /> {t('common.copy')}
          </button>
          <button
            onClick={onDuplicate}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
          >
            <CopyPlus className="w-4 h-4" /> {t('common.duplicate')}
          </button>

          {onChangeNodeType ? (
            <>
              <div className="h-px bg-[var(--color-brand-border)] my-1" />
              <div className="px-3 py-1 text-[10px] font-semibold text-[var(--brand-secondary)] uppercase">
                Switch type
              </div>
              <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                {nodeTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChangeNodeType(option.id)}
                    className={`rounded-[var(--radius-xs)] px-2 py-1.5 text-xs font-medium transition-colors ${
                      currentNodeType === option.id
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-[var(--brand-background)] text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {currentNodeType === 'section' || hasParentSection ? (
            <>
              <div className="h-px bg-[var(--color-brand-border)] my-1" />
              {currentNodeType === 'section' && onFitSectionToContents ? (
                <button
                  onClick={onFitSectionToContents}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                  <Maximize2 className="w-4 h-4" /> Fit Contents
                </button>
              ) : null}
              {currentNodeType === 'section' && onBringContentsIntoSection ? (
                <button
                  onClick={onBringContentsIntoSection}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                  <FolderInput className="w-4 h-4" /> Bring Inside
                </button>
              ) : null}
              {hasParentSection && onReleaseFromSection ? (
                <button
                  onClick={onReleaseFromSection}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                  <ArrowUpRight className="w-4 h-4" /> Release From Section
                </button>
              ) : null}
              {currentNodeType === 'section' && onToggleSectionLock ? (
                <button
                  onClick={onToggleSectionLock}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                  {isSectionLocked ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isSectionLocked ? 'Unlock Section' : 'Lock Section'}
                </button>
              ) : null}
              {currentNodeType === 'section' && onToggleSectionHidden ? (
                <button
                  onClick={onToggleSectionHidden}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                  {isSectionHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {isSectionHidden ? 'Show Section' : 'Hide Section'}
                </button>
              ) : null}
            </>
          ) : null}

          <div className="h-px bg-[var(--color-brand-border)] my-1" />

          <button
            onClick={onBringToFront}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
          >
            <BringToFront className="w-4 h-4" /> {t('common.bringToFront')}
          </button>
          <button
            onClick={onSendToBack}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
          >
            <SendToBack className="w-4 h-4" /> {t('common.sendToBack')}
          </button>

          <div className="h-px bg-[var(--color-brand-border)] my-1" />

          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
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
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
            >
              <Pencil className="w-4 h-4" /> {t('common.editLabel')}
            </button>
          )}
          <button
            onClick={onDuplicate}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
          >
            <Replace className="w-4 h-4" /> {t('common.reverseDirection')}
          </button>
          <div className="h-px bg-[var(--color-brand-border)] my-1" />
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> {t('common.deleteConnection')}
          </button>
        </>
      )}

      {type === 'multi' && (
        <>
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--brand-secondary)] uppercase tracking-wider">
            {t('common.itemsSelected', { count: selectedCount })}
          </div>

          {/* Align */}
          {onAlignNodes && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold text-[var(--brand-secondary)] uppercase">
                {t('common.align')}
              </div>
              <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
                <button
                  onClick={() => onAlignNodes('left')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignLeft')}
                >
                  <AlignStartVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('center')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignCenter')}
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('right')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignRight')}
                >
                  <AlignEndVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('top')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignTop')}
                >
                  <AlignStartHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('middle')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignMiddle')}
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlignNodes('bottom')}
                  className="flex items-center justify-center rounded-[var(--radius-xs)] p-1.5 text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                  title={t('common.alignBottom')}
                >
                  <AlignEndHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Distribute */}
          {onDistributeNodes && (
            <>
              <div className="h-px bg-[var(--color-brand-border)] my-0.5" />
              <div className="px-3 py-1 text-[10px] font-semibold text-[var(--brand-secondary)] uppercase">
                {t('common.distribute')}
              </div>
              <button
                onClick={() => onDistributeNodes('horizontal')}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
              >
                <ArrowRightFromLine className="w-4 h-4" /> {t('common.distributeHorizontally')}
              </button>
              <button
                onClick={() => onDistributeNodes('vertical')}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-sm text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
              >
                <ArrowDownFromLine className="w-4 h-4" /> {t('common.distributeVertically')}
              </button>
            </>
          )}

          {/* Group */}
          {onGroupSelected && (
            <>
              <div className="h-px bg-[var(--color-brand-border)] my-0.5" />
              <button
                onClick={onGroupSelected}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <Group className="w-4 h-4" /> {t('common.group')}
              </button>
            </>
          )}

          <div className="h-px bg-[var(--color-brand-border)] my-0.5" />
          <button
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> {t('common.delete')} ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
};
