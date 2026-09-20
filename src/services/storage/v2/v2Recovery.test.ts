import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { getRecord, putRecord } from '../indexedDbHelpers';
import {
  FLOW_PERSISTENCE_DB_NAME,
  V2_DOCUMENTS_STORE_NAME,
  V2_RECOVERY_STORE_NAME,
  openFlowPersistenceDatabase,
} from '../indexedDbSchema';
import { V2StorageQuotaError, V2StorageUnavailableError } from './v2Errors';
import {
  createV2Repository,
  type LoadV2DocumentResult,
  type V2DocumentRecord,
} from './v2Repository';

async function resetTestDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(FLOW_PERSISTENCE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function labeledDocument(label: string): SceneDocumentV1 {
  return createTestDocument({ nodes: [createTestNode('node-1', { content: { label } })] });
}

function nodeLabel(record: V2DocumentRecord): unknown {
  return record.document.pages[0].nodes[0]?.content.label;
}

function requireStatus<TStatus extends LoadV2DocumentResult['status']>(
  result: LoadV2DocumentResult,
  status: TStatus
): Extract<LoadV2DocumentResult, { readonly status: TStatus }> {
  if (result.status !== status) throw new Error(`Expected ${status}, got ${result.status}.`);
  return result as Extract<LoadV2DocumentResult, { readonly status: TStatus }>;
}

// Throws a quota failure only for puts to the selected stores; every other
// put runs for real. Restores the original put when the returned callback runs.
function failPutWithQuota(stores?: readonly string[]): () => void {
  const original = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
    function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (!stores || stores.includes(this.name)) {
        throw new DOMException('Quota exceeded.', 'QuotaExceededError');
      }
      return original.call(this, value, key);
    }
  );
  return () => spy.mockRestore();
}

beforeEach(resetTestDatabase);

describe('v2 document recovery', () => {
  it('surfaces quota failures without changing the stored record', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('One'), 1);

    const restore = failPutWithQuota();
    try {
      await expect(
        repository.saveDocument('document-1', labeledDocument('Two'), 2)
      ).rejects.toBeInstanceOf(V2StorageQuotaError);
    } finally {
      restore();
    }

    const record = requireStatus(await repository.loadDocument('document-1'), 'ok').record;
    expect(record.revision).toBe(1);
    expect(nodeLabel(record)).toBe('One');
  });

  it('keeps the previous record when the transaction aborts mid-save', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('One'), 1);
    await repository.saveDocument('document-1', labeledDocument('Two'), 2);

    // The last-known-good write succeeds, then the primary put fails: the
    // abort must roll the last-known-good write back with it.
    const restore = failPutWithQuota([V2_DOCUMENTS_STORE_NAME]);
    try {
      await expect(
        repository.saveDocument('document-1', labeledDocument('Three'), 3)
      ).rejects.toBeInstanceOf(V2StorageQuotaError);
    } finally {
      restore();
    }

    const record = requireStatus(await repository.loadDocument('document-1'), 'ok').record;
    expect(record.revision).toBe(2);
    expect(nodeLabel(record)).toBe('Two');

    const database = await openFlowPersistenceDatabase(indexedDB);
    const lastKnownGood = await getRecord<V2DocumentRecord>(
      database,
      V2_RECOVERY_STORE_NAME,
      'document-1'
    );
    database.close();
    expect(lastKnownGood?.revision).toBe(1);
    expect(lastKnownGood && nodeLabel(lastKnownGood)).toBe('One');
  });

  it('falls back to last-known-good when the primary record is corrupt', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('One'), 1);
    await repository.saveDocument('document-1', labeledDocument('Two'), 2);

    const database = await openFlowPersistenceDatabase(indexedDB);
    const primary = await getRecord<V2DocumentRecord>(
      database,
      V2_DOCUMENTS_STORE_NAME,
      'document-1'
    );
    await putRecord(database, V2_DOCUMENTS_STORE_NAME, { ...primary, document: { bogus: true } });
    database.close();

    const record = requireStatus(await repository.loadDocument('document-1'), 'recovered').record;
    expect(record.revision).toBe(1);
    expect(nodeLabel(record)).toBe('One');
  });

  it('never promotes a corrupt primary to last-known-good on the next save', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('One'), 1);
    await repository.saveDocument('document-1', labeledDocument('Two'), 2);

    const database = await openFlowPersistenceDatabase(indexedDB);
    const primary = await getRecord<V2DocumentRecord>(
      database,
      V2_DOCUMENTS_STORE_NAME,
      'document-1'
    );
    await putRecord(database, V2_DOCUMENTS_STORE_NAME, { ...primary, document: { bogus: true } });
    database.close();

    await repository.saveDocument('document-1', labeledDocument('Three'), 3);

    const reopened = await openFlowPersistenceDatabase(indexedDB);
    const fallback = await getRecord<V2DocumentRecord>(
      reopened,
      V2_RECOVERY_STORE_NAME,
      'document-1'
    );
    reopened.close();
    expect(fallback?.revision).toBe(1);
    expect(nodeLabel(fallback!)).toBe('One');
  });

  it('reports corrupt when neither the primary nor last-known-good is usable', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('One'), 1);

    const database = await openFlowPersistenceDatabase(indexedDB);
    await putRecord(database, V2_DOCUMENTS_STORE_NAME, {
      id: 'document-1',
      revision: 1,
      schemaVersion: 1,
      document: { bogus: true },
      savedAt: '2026-09-21T00:00:00.000Z',
    });
    database.close();

    const loaded = await repository.loadDocument('document-1');
    expect(loaded.status).toBe('corrupt');
    if (loaded.status !== 'corrupt') throw new Error('Expected a corrupt load.');
    expect(loaded.issues.length).toBeGreaterThan(0);
  });

  it('rejects reads and writes when IndexedDB is unavailable', async () => {
    const repository = createV2Repository(null);
    await expect(
      repository.saveDocument('document-1', labeledDocument('One'), 1)
    ).rejects.toBeInstanceOf(V2StorageUnavailableError);
    await expect(repository.loadDocument('document-1')).rejects.toBeInstanceOf(
      V2StorageUnavailableError
    );
  });
});
