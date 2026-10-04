import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '@/opencanvas/testing/builders/documentBuilder';
import { exportCanonicalSvg } from '@/opencanvas/infrastructure/export/canonicalSvg';
import { serializeCanonicalJson } from '@/opencanvas/infrastructure/export/canonicalJson';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { getRecord, putRecord } from '../indexedDbHelpers';
import {
  FLOW_PERSISTENCE_DB_NAME,
  PERSISTED_DOCUMENTS_STORE_NAME,
  V2_DOCUMENTS_STORE_NAME,
  openFlowPersistenceDatabase,
} from '../indexedDbSchema';
import {
  V2_THUMBNAIL_MAX_CHARS,
  createV2Repository,
  type LoadV2DocumentResult,
  type V2DocumentRecord,
} from './v2Repository';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

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

function requireOk(result: LoadV2DocumentResult): V2DocumentRecord {
  if (result.status !== 'ok') throw new Error(`Expected an ok load, got ${result.status}.`);
  return result.record;
}

beforeEach(resetTestDatabase);

describe('v2 document repository', () => {
  it('round-trips a saved document with its revision', async () => {
    const repository = createV2Repository(indexedDB);
    const document = labeledDocument('Round trip');
    const saved = await repository.saveDocument('document-1', document, 3);
    expect(saved.status).toBe('saved');

    const record = requireOk(await repository.loadDocument('document-1'));
    expect(record.document).toEqual(document);
    expect(record.revision).toBe(3);
  });

  it('round-trips a document with no nodes', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', createTestDocument(), 1);
    expect(requireOk(await repository.loadDocument('document-1')).document).toEqual(
      createTestDocument()
    );
  });

  it('rejects a save whose revision is not newer than the stored one', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('document-1', labeledDocument('Five'), 5);
    const second = await repository.saveDocument('document-1', labeledDocument('Three'), 3);
    expect(second).toEqual({ status: 'stale', storedRevision: 5 });
    expect(requireOk(await repository.loadDocument('document-1')).document.pages[0].nodes[0])
      .toMatchObject({ content: { label: 'Five' } });
  });

  it('rejects a second tab saving over a newer revision', async () => {
    const tabA = createV2Repository(indexedDB);
    const tabB = createV2Repository(indexedDB);
    await tabA.saveDocument('document-1', labeledDocument('Base'), 2);

    expect(await tabA.loadDocument('document-1')).toMatchObject({ status: 'ok' });
    expect(await tabB.loadDocument('document-1')).toMatchObject({ status: 'ok' });
    expect(await tabA.saveDocument('document-1', labeledDocument('Tab A'), 3)).toMatchObject({
      status: 'saved',
    });
    expect(await tabB.saveDocument('document-1', labeledDocument('Tab B'), 3)).toEqual({
      status: 'stale',
      storedRevision: 3,
    });
    expect(requireOk(await tabA.loadDocument('document-1')).document.pages[0].nodes[0])
      .toMatchObject({ content: { label: 'Tab A' } });
  });

  it('orders two saves issued in the same tick', async () => {
    const repository = createV2Repository(indexedDB);
    const first = repository.saveDocument('document-1', labeledDocument('First'), 3);
    const second = repository.saveDocument('document-1', labeledDocument('Second'), 4);
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toMatchObject({ status: 'saved' });
    expect(secondResult).toMatchObject({ status: 'saved' });
    const record = requireOk(await repository.loadDocument('document-1'));
    expect(record.revision).toBe(4);
    expect(record.document.pages[0].nodes[0]).toMatchObject({ content: { label: 'Second' } });
  });

  it('reports missing for an id that was never saved', async () => {
    expect(await createV2Repository(indexedDB).loadDocument('absent')).toEqual({
      status: 'missing',
    });
  });

  it('opens newer-schema records read-only without coercing them', async () => {
    const database = await openFlowPersistenceDatabase(indexedDB);
    const futureDocument = {
      ...labeledDocument('Future'),
      schemaVersion: 99,
    } as unknown as SceneDocumentV1;
    await putRecord(database, V2_DOCUMENTS_STORE_NAME, {
      id: 'document-1',
      revision: 5,
      schemaVersion: 99,
      document: futureDocument,
      savedAt: '2026-09-21T00:00:00.000Z',
    });
    database.close();

    const loaded = await createV2Repository(indexedDB).loadDocument('document-1');
    expect(loaded.status).toBe('read-only');
    if (loaded.status !== 'read-only') throw new Error('Expected a read-only load.');
    expect(loaded.schemaVersion).toBe(99);
    expect(loaded.record.revision).toBe(5);
    expect(loaded.preserved).toEqual(JSON.parse(JSON.stringify(futureDocument)));
  });

  it('upgrades an existing v1 database without touching its records', async () => {
    const v1Record = { id: 'v1-doc', name: 'Legacy', nodes: [], edges: [] };
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(FLOW_PERSISTENCE_DB_NAME, 3);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(PERSISTED_DOCUMENTS_STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await putRecord(raw, PERSISTED_DOCUMENTS_STORE_NAME, v1Record);
    raw.close();
    const before = sha256(JSON.stringify(v1Record));

    const repository = createV2Repository(indexedDB);
    expect(
      await repository.saveDocument('document-1', labeledDocument('After upgrade'), 1)
    ).toMatchObject({ status: 'saved' });
    expect(requireOk(await repository.loadDocument('document-1')).revision).toBe(1);

    const check = await openFlowPersistenceDatabase(indexedDB);
    const v1After = await getRecord(check, PERSISTED_DOCUMENTS_STORE_NAME, 'v1-doc');
    check.close();
    expect(v1After).toEqual(v1Record);
    expect(sha256(JSON.stringify(v1After))).toBe(before);
  });

  it('exports a saved-then-loaded document byte-identically', async () => {
    const repository = createV2Repository(indexedDB);
    const original = labeledDocument('Export me');
    await repository.saveDocument('document-1', original, 2);
    const loaded = requireOk(await repository.loadDocument('document-1')).document;
    expect(serializeCanonicalJson(loaded)).toBe(serializeCanonicalJson(original));
    expect(exportCanonicalSvg(loaded)).toBe(exportCanonicalSvg(original));
  });
});

describe('v2 document list', () => {
  it('lists documents newest first and deletes one with its recovery copy', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('older', { ...labeledDocument('A'), name: 'Older' }, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.saveDocument('newer', { ...labeledDocument('B'), name: 'Newer' }, 1);
    await repository.saveDocument('newer', { ...labeledDocument('C'), name: 'Newer' }, 2);
    expect((await repository.listDocuments()).map(({ id, name, pageCount }) => [id, name, pageCount]))
      .toEqual([['newer', 'Newer', 1], ['older', 'Older', 1]]);

    await repository.deleteDocument('newer');
    expect((await repository.listDocuments()).map(({ id }) => id)).toEqual(['older']);
    expect(await repository.loadDocument('newer')).toEqual({ status: 'missing' });
    const database = await openFlowPersistenceDatabase(indexedDB);
    expect(await getRecord(database, 'v2Recovery', 'newer')).toBeNull();
    database.close();
  });

  it('archives documents and restores them; a save from a tab still editing one restores it', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('a', { ...labeledDocument('A'), name: 'A' }, 1);
    await repository.saveDocument('b', { ...labeledDocument('B'), name: 'B' }, 1);
    await repository.archiveDocuments(['a', 'b', 'never-saved']);
    expect(await repository.listDocuments()).toEqual([]);
    const archive = await repository.listArchive();
    expect(archive.map(({ id }) => id).sort()).toEqual(['a', 'b']);
    expect(archive.every(({ archivedAt }) => typeof archivedAt === 'string')).toBe(true);
    // The archive keeps the document whole: it still opens.
    expect(requireOk(await repository.loadDocument('a')).document.name).toBe('A');

    await repository.restoreDocuments(['a']);
    expect((await repository.listDocuments()).map(({ id }) => id)).toEqual(['a']);
    expect((await repository.listDocuments())[0]).not.toHaveProperty('archivedAt');

    await repository.saveDocument('b', { ...labeledDocument('B2'), name: 'B' }, 2);
    expect((await repository.listArchive()).map(({ id }) => id)).toEqual([]);
  });
});

describe('v2 thumbnails', () => {
  const light = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#fff"/></svg>';
  const dark = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#000"/></svg>';

  it('stores one per document beside the record and lists them by id', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('a', labeledDocument('A'), 1);
    await repository.saveThumbnail('a', { light, dark });
    await repository.saveThumbnail('a', { light: dark, dark: light });
    const thumbnails = await repository.listThumbnails();
    expect(thumbnails.get('a')).toEqual({ light: dark, dark: light });
    expect(thumbnails.has('never-saved')).toBe(false);
    // The document record itself carries no image: listing and saving stay as cheap as before.
    const database = await openFlowPersistenceDatabase(indexedDB);
    expect(Object.keys(await getRecord(database, V2_DOCUMENTS_STORE_NAME, 'a') as object).sort())
      .toEqual(['document', 'id', 'revision', 'savedAt', 'schemaVersion']);
    database.close();
  });

  it('keeps an oversized pair as a placeholder, not a partial image', async () => {
    const repository = createV2Repository(indexedDB);
    const huge = `<svg>${'x'.repeat(V2_THUMBNAIL_MAX_CHARS)}</svg>`;
    await repository.saveThumbnail('big', { light: huge, dark });
    expect((await repository.listThumbnails()).get('big')).toBeNull();
  });

  it('deletes the thumbnail with its document', async () => {
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument('gone', labeledDocument('G'), 1);
    await repository.saveThumbnail('gone', { light, dark });
    await repository.deleteDocument('gone');
    expect((await repository.listThumbnails()).has('gone')).toBe(false);
  });
});
