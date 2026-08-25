import { describe, expect, it } from 'vitest';
import {
  calculateStorageCategoryAccounting,
  estimateStructuredStorageBytes,
  formatStorageBytes,
} from './storageAccounting';
import {
  ASSETS_STORE_NAME,
  CHAT_MESSAGES_STORE_NAME,
  FLOW_DOCUMENT_STORE_NAME,
  PERSISTED_DOCUMENTS_STORE_NAME,
  PREFERENCES_STORE_NAME,
} from './indexedDbSchema';
import { APP_STORAGE_KEYS } from '@/lib/legacyBranding';

describe('storage accounting', () => {
  it('counts strings and binary payloads without double-counting cycles', () => {
    const cyclic: { label: string; self?: unknown } = { label: 'four' };
    cyclic.self = cyclic;
    const estimate = estimateStructuredStorageBytes({
      cyclic,
      blob: new Blob([new Uint8Array(32)]),
      buffer: new Uint8Array(16),
    });
    expect(estimate.bytes).toBeGreaterThanOrEqual(56);
    expect(estimate.truncated).toBe(false);
  });

  it('separates documents, snapshots, assets, conversations, and app data', () => {
    const result = calculateStorageCategoryAccounting([
      { storeName: PERSISTED_DOCUMENTS_STORE_NAME, value: { id: 'doc', value: 'document' } },
      {
        storeName: FLOW_DOCUMENT_STORE_NAME,
        value: { id: APP_STORAGE_KEYS.snapshots, value: 'snapshots' },
      },
      { storeName: ASSETS_STORE_NAME, value: { id: 'asset', bytes: new Blob(['asset']) } },
      { storeName: CHAT_MESSAGES_STORE_NAME, value: { id: 'message', value: 'chat' } },
      { storeName: PREFERENCES_STORE_NAME, value: { id: 'theme', value: 'dark' } },
    ]);
    expect(Object.fromEntries(result.categories.map((category) => [
      category.category,
      category.records,
    ]))).toEqual({ documents: 1, snapshots: 1, assets: 1, conversations: 1, appData: 1 });
  });

  it('formats storage totals with stable binary units', () => {
    expect(formatStorageBytes(512)).toBe('512 B');
    expect(formatStorageBytes(1_536)).toBe('1.5 KB');
    expect(formatStorageBytes(2 * 1_048_576)).toBe('2.0 MB');
  });
});
