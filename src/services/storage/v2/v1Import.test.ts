// @vitest-environment node
// Node's Blob survives IndexedDB cloning and has arrayBuffer(); jsdom's does neither.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { putRecord } from '../indexedDbHelpers';
import { ASSETS_STORE_NAME, FLOW_PERSISTENCE_DB_NAME, PERSISTED_DOCUMENTS_STORE_NAME, V2_DOCUMENTS_STORE_NAME, openFlowPersistenceDatabase } from '../indexedDbSchema';
import { V1_BACKUP_FORMAT, V1_IMPORT_MARKER_KEY, buildV1Backup, importV1Workspace, isV1Backup, openV1Backup, readV1ImportMarker } from './v1Import';
import { createV2Repository } from './v2Repository';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped v1 fixture JSON
type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync('src/services/storage/v2/__fixtures__/v1/indexeddb.json', 'utf8')).indexedDb;
const manifest = JSON.parse(readFileSync('src/services/storage/v2/__fixtures__/v1/manifest.json', 'utf8')) as Record<string, string>;
// Native-editable rows: no Mermaid picture to redraw, no image bytes to read.
const rows = (fixture.documents as Json[]).filter((row) => manifest[row.id]?.endsWith('(native_editable)')).slice(0, 3);
const v2Id = (row: Json) => `v1-${row.id}`;

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key); },
    setItem: (key, value) => { map.set(key, value); },
  };
}

async function seed(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(FLOW_PERSISTENCE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  const database = await openFlowPersistenceDatabase(indexedDB);
  for (const row of rows) await putRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, row);
  database.close();
}

const run = (storage: Storage) => importV1Workspace({
  factory: indexedDB, storage, repository: createV2Repository(indexedDB), now: () => '2026-10-03T00:00:00.000Z',
});

beforeEach(seed);

describe('importV1Workspace', () => {
  it('imports each v1 document once; a clean marker makes the next boot a no-op', async () => {
    expect(rows).toHaveLength(3);
    const storage = memoryStorage();
    const first = await run(storage);
    expect([...first.imported].sort()).toEqual(rows.map(v2Id).sort());
    expect(Object.values(readV1ImportMarker(storage)!.docs).map((entry) => entry.status)).toEqual(rows.map(() => 'imported'));
    expect(first.firstRun).toBe(true);
    expect(await run(storage)).toEqual({ imported: [], failures: [], firstRun: false });
  });

  it('never overwrites a copy that already exists, and retries what failed', async () => {
    const repository = createV2Repository(indexedDB);
    await run(memoryStorage());
    const edited = await repository.loadDocument(v2Id(rows[0]!));
    if (edited.status !== 'ok') throw new Error(edited.status);
    await repository.saveDocument(edited.record.id, { ...edited.record.document, name: 'Edited in v2' }, 2);

    const failed = { [rows[0]!.id]: { importedAt: '', sourceUpdatedAt: '', status: 'failed', error: 'quota' } };
    const storage = memoryStorage({ [V1_IMPORT_MARKER_KEY]: JSON.stringify({ completedAt: '', docs: failed }) });
    expect((await run(storage)).imported).toEqual([]);
    const after = await repository.loadDocument(v2Id(rows[0]!));
    expect(after.status === 'ok' && [after.record.revision, after.record.document.name]).toEqual([2, 'Edited in v2']);
    expect(readV1ImportMarker(storage)!.docs[rows[0]!.id]!.status).toBe('imported');
  });

  it('reports an unreadable source without filing it under a document', async () => {
    const storage = memoryStorage({ 'openflowkit-documents-fallback': '{not json' });
    const report = await run(storage);
    expect(report.failures.map((failure) => failure.name)).toEqual(['openflowkit-documents-fallback']);
    expect(Object.keys(readV1ImportMarker(storage)!.docs).sort()).toEqual(rows.map((row) => row.id).sort());
  });
  it('takes a v1 edit made after the import: replaces an untouched copy, keeps both when v2 edited it too', async () => {
    const storage = memoryStorage();
    const repository = createV2Repository(indexedDB);
    await run(storage);
    const [untouched, edited] = [rows[0]!, rows[1]!];
    const loaded = await repository.loadDocument(v2Id(edited));
    if (loaded.status !== 'ok') throw new Error(loaded.status);
    await repository.saveDocument(v2Id(edited), { ...loaded.record.document, name: 'Edited in v2' }, 2);
    // An old v1 tab, still open after the cutover, saves both documents again.
    const database = await openFlowPersistenceDatabase(indexedDB);
    for (const row of [untouched, edited]) {
      await putRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, { ...row, name: `${row.name} v1-later`, updatedAt: '2027-01-01T00:00:00.000Z' });
    }
    database.close();

    const report = await run(storage);
    const replaced = await repository.loadDocument(v2Id(untouched));
    expect(replaced.status === 'ok' && [replaced.record.revision, replaced.record.document.name]).toEqual([2, `${untouched.name} v1-later`]);
    const kept = await repository.loadDocument(v2Id(edited));
    expect(kept.status === 'ok' && kept.record.document.name).toBe('Edited in v2');
    const copyId = `${v2Id(edited)}~20270101000000000`;
    const copy = await repository.loadDocument(copyId);
    expect(copy.status === 'ok' && copy.record.document.name).toBe(`${edited.name} v1-later (later v1 edit)`);
    expect([...report.imported].sort()).toEqual([v2Id(untouched), copyId].sort());
    expect(await run(storage)).toEqual({ imported: [], failures: [], firstRun: false });
  });
});

describe('v1 backup file', () => {
  const imageRow = (fixture.documents as Json[]).find((row) => manifest[row.id] === 'image')!;
  const asset = fixture.assets[0] as Json;

  it('writes the 12.1 format read-only: live documents, no undo history, images inline', async () => {
    const database = await openFlowPersistenceDatabase(indexedDB);
    const bytes = await (await fetch(asset.bytes.$blob)).blob();
    await putRecord(database, ASSETS_STORE_NAME, { ...asset, bytes });
    const withHistory = { ...imageRow, pages: imageRow.pages.map((page: Json) => ({ ...page, content: { ...page.content, history: { past: [1], future: [] } } })) };
    await putRecord(database, PERSISTED_DOCUMENTS_STORE_NAME, withHistory);
    database.close();

    const backup = await buildV1Backup(indexedDB, memoryStorage(), new Date('2026-10-03T00:00:00.000Z'));
    expect(isV1Backup(backup)).toBe(true);
    expect([backup.format, backup.version, backup.exportedAt]).toEqual([V1_BACKUP_FORMAT, 1, '2026-10-03T00:00:00.000Z']);
    expect(backup.documents.map((row) => row.id).sort()).toEqual([...rows.map((row) => row.id), imageRow.id].sort());
    const page = (backup.documents.find((row) => row.id === imageRow.id)!.pages as Json[])[0]!;
    expect(page.content.history).toBeUndefined();
    const image = (page.content.nodes as Json[]).find((node) => node.type === 'image')!;
    expect(image.data.imageAssetId).toBeUndefined();
    expect(image.data.imageUrl).toMatch(/^data:image\//);
  });

  it('backs up the localStorage copies when IndexedDB will not open, as v1 read them then', async () => {
    const blocked = { open: () => { throw new DOMException('blocked', 'SecurityError'); } } as unknown as IDBFactory;
    const backup = await buildV1Backup(blocked, memoryStorage({ 'openflowkit-documents-fallback': JSON.stringify([rows[0]]) }));
    expect(backup.documents.map((row) => row.id)).toEqual([rows[0]!.id]);
  });

  it('opens a backup as one document per diagram; opening it again adds nothing', async () => {
    const backup = JSON.parse(JSON.stringify(await buildV1Backup(indexedDB, memoryStorage())));
    const database = await openFlowPersistenceDatabase(indexedDB);
    database.transaction(V2_DOCUMENTS_STORE_NAME, 'readwrite').objectStore(V2_DOCUMENTS_STORE_NAME).clear();
    database.close();
    const repository = createV2Repository(indexedDB);
    const first = await openV1Backup(backup, repository);
    expect([...first.opened].sort()).toEqual(rows.map(v2Id).sort());
    expect(first.failures).toEqual([]);
    expect(await openV1Backup(backup, repository)).toEqual({ opened: [], existing: rows.length, failures: [] });
  });
});

