import React, { useCallback, useEffect, useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  formatStorageBytes,
  inspectStorageAccounting,
  type StorageAccountingCategory,
  type StorageAccountingSnapshot,
} from '@/services/storage/storageAccounting';

interface StorageAccountingPanelProps {
  inspect?: () => Promise<StorageAccountingSnapshot>;
}

const CATEGORY_KEYS: Record<StorageAccountingCategory, string> = {
  documents: 'settings.storageDocuments',
  snapshots: 'settings.storageSnapshots',
  assets: 'settings.storageAssets',
  conversations: 'settings.storageConversations',
  appData: 'settings.storageAppData',
};

export function StorageAccountingPanel({
  inspect = inspectStorageAccounting,
}: StorageAccountingPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<StorageAccountingSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  const refresh = useCallback(() => {
    setStatus('loading');
    void inspect().then(
      (next) => {
        setSnapshot(next);
        setStatus('ready');
      },
      () => setStatus('failed')
    );
  }, [inspect]);

  useEffect(() => {
    let cancelled = false;
    void inspect().then(
      (next) => {
        if (cancelled) return;
        setSnapshot(next);
        setStatus('ready');
      },
      () => {
        if (!cancelled) setStatus('failed');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [inspect]);

  const hasBrowserTotal = snapshot?.browserUsageBytes !== null
    && snapshot?.browserQuotaBytes !== null;

  return (
    <section aria-labelledby="storage-accounting-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="storage-accounting-title" className="text-sm font-semibold text-[var(--brand-text)]">
            {t('settings.storageTitle', 'Local storage')}
          </h3>
          <p className="mt-1 text-[11px] text-[var(--brand-secondary)]">
            {t('settings.storageDescription', 'Estimated local usage by category. Nothing is uploaded.')}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={status === 'loading'}
          aria-label={t('settings.storageRefresh', 'Refresh storage estimate')}
          className="rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] p-2 text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)]">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--brand-text)]">
              {hasBrowserTotal && snapshot
                ? t('settings.storageBrowserTotal', '{{used}} of {{quota}} used in this browser origin', {
                    used: formatStorageBytes(snapshot.browserUsageBytes ?? 0),
                    quota: formatStorageBytes(snapshot.browserQuotaBytes ?? 0),
                  })
                : t('settings.storageCategorizedTotal', '{{total}} categorized app data', {
                    total: formatStorageBytes(snapshot?.categorizedBytes ?? 0),
                  })}
            </p>
            <p aria-live="polite" className="text-[11px] text-[var(--brand-secondary)]">
              {status === 'loading'
                ? t('settings.storageLoading', 'Calculating local usage…')
                : status === 'failed' || snapshot?.status === 'unavailable'
                  ? t('settings.storageUnavailable', 'Storage accounting is unavailable in this browser.')
                  : snapshot?.status === 'partial'
                    ? t('settings.storagePartial', 'Partial estimate; some records could not be inspected.')
                    : t('settings.storageComplete', 'Estimate complete.')}
            </p>
          </div>
        </div>

        {snapshot && snapshot.status !== 'unavailable' ? (
          <dl className="space-y-2" data-testid="storage-accounting-categories">
            {snapshot.categories.map((category) => (
              <div
                key={category.category}
                data-testid={`storage-category-${category.category}`}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <dt className="text-[var(--brand-secondary)]">
                  {t(CATEGORY_KEYS[category.category])}
                </dt>
                <dd className="font-mono tabular-nums text-[var(--brand-text)]">
                  {formatStorageBytes(category.estimatedBytes)}
                </dd>
              </div>
            ))}
            {snapshot.unattributedBytes !== null && snapshot.unattributedBytes > 0 ? (
              <div className="flex items-center justify-between gap-4 border-t border-[var(--color-brand-border)] pt-2 text-xs">
                <dt className="text-[var(--brand-secondary)]">
                  {t('settings.storageUnattributed', 'Other origin storage')}
                </dt>
                <dd className="font-mono tabular-nums text-[var(--brand-text)]">
                  {formatStorageBytes(snapshot.unattributedBytes)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
