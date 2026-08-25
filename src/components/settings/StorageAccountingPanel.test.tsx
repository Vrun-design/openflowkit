import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorageAccountingPanel } from './StorageAccountingPanel';
import type { StorageAccountingSnapshot } from '@/services/storage/storageAccounting';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | Record<string, unknown>) =>
      typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key,
  }),
}));

const snapshot: StorageAccountingSnapshot = {
  status: 'complete',
  source: 'indexeddb',
  categories: [
    { category: 'documents', estimatedBytes: 2_048, records: 2 },
    { category: 'snapshots', estimatedBytes: 1_024, records: 1 },
    { category: 'assets', estimatedBytes: 4_096, records: 1 },
    { category: 'conversations', estimatedBytes: 512, records: 3 },
    { category: 'appData', estimatedBytes: 256, records: 2 },
  ],
  categorizedBytes: 7_936,
  browserUsageBytes: 10_000,
  browserQuotaBytes: 100_000,
  unattributedBytes: 2_064,
  truncated: false,
};

describe('StorageAccountingPanel', () => {
  it('renders every category and honest browser residual', async () => {
    render(<StorageAccountingPanel inspect={vi.fn(async () => snapshot)} />);
    await waitFor(() => expect(screen.getByText('Estimate complete.')).toBeInTheDocument());
    expect(screen.getByTestId('storage-accounting-categories').children).toHaveLength(6);
    expect(screen.getByTestId('storage-category-assets')).toHaveTextContent('4.0 KB');
    expect(screen.getByText('Other origin storage')).toBeInTheDocument();
  });

  it('reports inspection failure without invented category values', async () => {
    render(<StorageAccountingPanel inspect={vi.fn(async () => Promise.reject(new Error('no')))} />);
    await waitFor(() => expect(screen.getByText(
      'Storage accounting is unavailable in this browser.'
    )).toBeInTheDocument());
    expect(screen.queryByTestId('storage-accounting-categories')).not.toBeInTheDocument();
  });
});
