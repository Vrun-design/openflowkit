import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Pencil, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

interface HomeFlowRenameDialogProps {
  flowName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nextName: string) => void;
}

interface HomeFlowDeleteDialogProps {
  flowName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  backupStatus: 'idle' | 'preparing' | 'ready' | 'failed';
  backupError?: string;
}

interface HomeBulkDeleteDialogProps {
  flowCount: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  backupStatus: 'idle' | 'preparing' | 'ready' | 'failed';
  backupError?: string;
}

function useDialogDismissal(
  isOpen: boolean,
  onClose: () => void
): React.RefObject<HTMLButtonElement | null> {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closeButtonRef.current?.focus();
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return closeButtonRef;
}

export function HomeFlowRenameDialog({
  flowName,
  isOpen,
  onClose,
  onSubmit,
}: HomeFlowRenameDialogProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState(flowName);
  const closeButtonRef = useDialogDismissal(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(draftName);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-flow-rename-title"
        aria-describedby="home-flow-rename-description"
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-overlay)]"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-brand-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="home-flow-rename-title"
                className="text-base font-semibold text-[var(--brand-text)]"
              >
                {t('home.renameFlow.title', 'Rename flow')}
              </h2>
              <p
                id="home-flow-rename-description"
                className="text-sm text-[var(--brand-secondary)]"
              >
                {t(
                  'home.renameFlow.description',
                  'Update the name shown on your dashboard and in the editor.'
                )}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <label
            htmlFor="home-flow-rename-input"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]"
          >
            {t('home.renameFlow.label', 'Flow name')}
          </label>
          <input
            id="home-flow-rename-input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-brand-border)] px-3 py-2.5 text-sm text-[var(--brand-text)] outline-none transition-colors placeholder:text-[var(--brand-secondary)] focus:border-[var(--brand-primary)]"
            placeholder={t('home.renameFlow.placeholder', 'Enter a flow name')}
            autoFocus
          />
          <p className="mt-2 text-xs text-[var(--brand-secondary)]">
            {t(
              'home.renameFlow.hint',
              'Names are local to this browser profile unless you export or sync them elsewhere.'
            )}
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save', 'Save')}
            </Button>
          </div>
        </form>
      </div>

      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label={t('home.renameFlow.closeDialog', 'Close rename flow dialog')}
      />
    </div>,
    document.body
  );
}

export function HomeFlowDeleteDialog({
  flowName,
  isOpen,
  onClose,
  onConfirm,
  backupStatus,
  backupError,
}: HomeFlowDeleteDialogProps): React.ReactElement | null {
  const { t } = useTranslation();
  const closeButtonRef = useDialogDismissal(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-flow-delete-title"
        aria-describedby="home-flow-delete-description"
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-overlay)]"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-brand-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="home-flow-delete-title"
                className="text-base font-semibold text-[var(--brand-text)]"
              >
                {t('home.deleteFlow.title', 'Delete flow')}
              </h2>
              <p
                id="home-flow-delete-description"
                className="text-sm text-[var(--brand-secondary)]"
              >
                {t(
                  'home.deleteFlow.description',
                  'This removes the local autosaved flow from this device.'
                )}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-[var(--brand-text)]">
            {t('home.deleteFlow.confirmation', 'Delete "{{name}}"?', { name: flowName })}
          </p>
          <p className="mt-2 text-xs text-[var(--brand-secondary)]">
            {t(
              'home.deleteFlow.hint',
              'A portable JSON backup will download before this flow is removed.'
            )}
          </p>
          {backupError ? (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {backupError}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={backupStatus !== 'ready'}
            >
              {backupStatus === 'preparing'
                ? t('home.deleteFlow.preparing', 'Preparing backup…')
                : t('home.deleteFlow.downloadAndDelete', 'Download backup & delete')}
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label={t('home.deleteFlow.closeDialog', 'Close delete flow dialog')}
      />
    </div>,
    document.body
  );
}

export function HomeBulkDeleteDialog({
  flowCount,
  isOpen,
  onClose,
  onConfirm,
  backupStatus,
  backupError,
}: HomeBulkDeleteDialogProps): React.ReactElement | null {
  const { t } = useTranslation();
  const closeButtonRef = useDialogDismissal(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-bulk-delete-title"
        aria-describedby="home-bulk-delete-description"
        className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-overlay)]"
      >
        <div className="flex items-start justify-between border-b border-[var(--color-brand-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="home-bulk-delete-title"
                className="text-base font-semibold text-[var(--brand-text)]"
              >
                {t('home.bulkDelete.title', 'Delete selected flows')}
              </h2>
              <p
                id="home-bulk-delete-description"
                className="text-sm text-[var(--brand-secondary)]"
              >
                {t(
                  'home.bulkDelete.description',
                  'This removes {{count}} local flows from this device.',
                  { count: flowCount }
                )}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-[var(--brand-text)]">
            {t('home.bulkDelete.confirmation', 'Delete {{count}} selected flows?', {
              count: flowCount,
            })}
          </p>
          <p className="mt-2 text-xs text-[var(--brand-secondary)]">
            {t(
              'home.bulkDelete.hint',
              'One portable workspace backup will download before any selected flow is removed.'
            )}
          </p>
          {backupError ? (
            <p role="alert" className="mt-3 text-xs text-red-500">
              {backupError}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirm}
              disabled={backupStatus !== 'ready'}
            >
              {backupStatus === 'preparing'
                ? t('home.bulkDelete.preparing', 'Preparing workspace backup…')
                : t(
                    'home.bulkDelete.downloadAndDelete',
                    'Download backup & delete {{count}} flows',
                    { count: flowCount }
                  )}
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label={t('home.bulkDelete.closeDialog', 'Close bulk delete dialog')}
      />
    </div>,
    document.body
  );
}
