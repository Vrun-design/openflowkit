import { legacyMermaidConverter } from '@/opencanvas/application/dsl/legacyMermaid';
import { isJsonObject, type JsonObject } from '@/opencanvas/domain/document/json';
import { legacyWorkspaceRows, migrateLegacyWorkspace, type LegacyImportFailure, type LegacyWorkspaceSources } from '@/opencanvas/domain/document/legacyWorkspace';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { elkDslLayoutPort } from '../../elk-layout/runtime';
import { readAssetUrl } from '../assets';
import { getIndexedDbFactory, requestToPromise } from '../indexedDbHelpers';
import {
  AI_SETTINGS_PERSISTENT_STORE_NAME,
  FLOW_METADATA_STORE_NAME,
  PERSISTED_DOCUMENTS_STORE_NAME,
  openFlowPersistenceDatabase,
} from '../indexedDbSchema';
import { defaultLegacyNodeSize } from './openDocumentFile';
import { createV2Repository, type V2DocumentRepository } from './v2Repository';

// Phase 12.3: v1 diagrams → v2 on boot. v1 rows are only ever read (D3); the copy goes
// through the v2 repository, and a clean marker makes every later boot a no-op.
export const V1_IMPORT_MARKER_KEY = 'ofk.v1Import';
const V1_FALLBACK_KEY = 'openflowkit-documents-fallback';
const V1_ZUSTAND_KEY = 'openflowkit-storage';

export interface V1ImportEntry {
  /** The v1 name, so a failure can be listed by what the user called it. */
  readonly name?: string;
  readonly importedAt: string;
  readonly sourceUpdatedAt: string;
  readonly status: 'imported' | 'failed';
  readonly error?: string;
  /** Revision this import wrote; a stored copy still at it was never edited in v2. */
  readonly v2Revision?: number;
}

export interface V1ImportMarker {
  readonly completedAt: string;
  readonly docs: Readonly<Record<string, V1ImportEntry>>;
}

export interface V1ImportReport {
  /** v2 ids written by this run, most recently edited in v1 first. */
  readonly imported: readonly string[];
  readonly failures: readonly LegacyImportFailure[];
  /** No marker existed before this run: the first time this browser met v2. */
  readonly firstRun: boolean;
}

export function readV1ImportMarker(storage: Storage = localStorage): V1ImportMarker | null {
  try {
    const marker = JSON.parse(storage.getItem(V1_IMPORT_MARKER_KEY) ?? 'null') as unknown;
    return isJsonObject(marker) && isJsonObject(marker.docs) ? (marker as unknown as V1ImportMarker) : null;
  } catch {
    return null;
  }
}

/** The three v1 sources, read-only: one readonly transaction and localStorage gets. */
export async function readV1Sources(factory: IDBFactory, storage: Storage): Promise<LegacyWorkspaceSources> {
  const database = await openFlowPersistenceDatabase(factory);
  try {
    const transaction = database.transaction([PERSISTED_DOCUMENTS_STORE_NAME, FLOW_METADATA_STORE_NAME], 'readonly');
    const [documents, metadata] = await Promise.all([
      requestToPromise(transaction.objectStore(PERSISTED_DOCUMENTS_STORE_NAME).getAll()),
      requestToPromise(transaction.objectStore(FLOW_METADATA_STORE_NAME).get(V1_ZUSTAND_KEY)),
    ]);
    const tabState = isJsonObject(metadata) && typeof metadata.value === 'string' ? metadata.value : null;
    // IndexedDB keeps `undefined` fields and Dates that JSON would not; normalise as v1's own JSON export does.
    return { documents: JSON.parse(JSON.stringify(documents)) as unknown[], fallback: storage.getItem(V1_FALLBACK_KEY), tabStates: [tabState, storage.getItem(V1_ZUSTAND_KEY)] };
  } finally {
    database.close();
  }
}

// v1 nodes keep only an id into the shared `assets` store; exports and other browsers need the
// bytes. The same pairs v1's own export inlined (main `assetInlining.ts`).
const ASSET_FIELDS = [['imageAssetId', 'imageUrl'], ['iconAssetId', 'customIconUrl']] as const;

async function inlineAssets(data: JsonObject, dropIds: boolean): Promise<JsonObject> {
  let next = data;
  for (const [idField, urlField] of ASSET_FIELDS) {
    const assetId = next[idField];
    if (typeof assetId !== 'string') continue;
    // The asset is the truth, as in v1 (its image ref prefers the id over a stale URL).
    const url = await readAssetUrl(assetId).catch(() => null);
    if (!url) continue;
    const { [idField]: _id, ...rest } = next;
    next = { ...(dropIds ? rest : next), [urlField]: url };
  }
  return next;
}

async function inlineImages(document: SceneDocumentV1): Promise<SceneDocumentV1> {
  const pages = await Promise.all(document.pages.map(async (page) => ({
    ...page,
    nodes: await Promise.all(page.nodes.map(async (node) => ({ ...node, content: await inlineAssets(node.content, false) }))),
  })));
  return { ...document, pages };
}

interface V1ImportDeps {
  readonly factory: IDBFactory | null;
  readonly storage: Storage;
  readonly repository: V2DocumentRepository;
  readonly now: () => string;
}

export async function importV1Workspace(deps: V1ImportDeps): Promise<V1ImportReport> {
  if (!deps.factory) return { imported: [], failures: [], firstRun: false };
  const marker = readV1ImportMarker(deps.storage);
  // ponytail: v1 is read on every boot, because a v1 tab left open across the cutover keeps
  // saving (12.1 bridge). Unchanged documents are skipped before any migration work; drop
  // the read once `v1-final` is old enough that no such tab can be alive.
  const previous = marker?.docs ?? {};
  const workspace = await migrateLegacyWorkspace(await readV1Sources(deps.factory, deps.storage), {
    resolveNodeSize: defaultLegacyNodeSize,
    convertMermaid: legacyMermaidConverter({ layout: elkDslLayoutPort }),
    skip: (v1Id, updatedAt) => previous[v1Id]?.status === 'imported' && previous[v1Id]?.sourceUpdatedAt === updatedAt,
  });
  const docs: Record<string, V1ImportEntry> = { ...previous };
  const imported: string[] = [];
  const failures = [...workspace.failures];
  const importedAt = deps.now();
  for (const failure of workspace.failures.filter((item) => item.v1Id)) {
    docs[failure.v1Id] = { name: failure.name, importedAt, sourceUpdatedAt: '', status: 'failed', error: failure.error };
  }
  const newestFirst = [...workspace.documents].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  for (const [v1Id, document] of newestFirst.map((item) => [item.id.slice('v1-'.length), item] as const)) {
    try {
      const prepared = await inlineImages(document);
      let id = document.id;
      let revision = 1;
      let result = await deps.repository.saveDocument(id, prepared, revision);
      const earlier = previous[v1Id];
      // `stale` = a copy exists. If it came from an earlier import and v1 has moved on since,
      // the newer v1 edit must not be dropped: replace the copy if v2 never touched it,
      // otherwise keep both.
      if (result.status === 'stale' && earlier?.status === 'imported') {
        if (result.storedRevision === (earlier.v2Revision ?? 1)) {
          revision = result.storedRevision + 1;
          result = await deps.repository.saveDocument(id, prepared, revision);
        } else {
          id = `${document.id}~${document.updatedAt.replace(/\D/g, '')}`;
          revision = 1;
          result = await deps.repository.saveDocument(id, { ...prepared, id, name: `${document.name} (later v1 edit)` }, revision);
        }
      }
      if (result.status === 'saved') imported.push(id);
      docs[v1Id] = {
        name: document.name, importedAt, sourceUpdatedAt: document.updatedAt, status: 'imported',
        v2Revision: id === document.id && result.status === 'saved' ? revision : earlier?.v2Revision ?? 1,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ v1Id, name: document.name, error: message });
      docs[v1Id] = { name: document.name, importedAt, sourceUpdatedAt: document.updatedAt, status: 'failed', error: message };
    }
  }
  const next: V1ImportMarker = { completedAt: importedAt, docs };
  // ponytail: a full localStorage loses the marker, so every boot re-reads v1 (saves stay no-ops,
  // but a v1-* doc deleted in v2 returns) — move the marker into IndexedDB if that shows up.
  try { deps.storage.setItem(V1_IMPORT_MARKER_KEY, JSON.stringify(next)); } catch { /* see above */ }
  return { imported, failures, firstRun: marker === null };
}

export interface V1AiSettingsRaw {
  /** v1's `AISettings` JSON without the key: IndexedDB `aiSettingsPersistent`, else localStorage. */
  readonly settings: string | null;
  /** v1's masked key (`v1:<base64>`); only `storageMode: 'local'` kept it past the session. */
  readonly secret: string | null;
}

/** v1's BYOK, read-only, for the one-time carry-over (12.7). */
export async function readV1AiSettings(factory: IDBFactory, storage: Storage): Promise<V1AiSettingsRaw> {
  const database = await openFlowPersistenceDatabase(factory);
  try {
    const row = await requestToPromise(database.transaction(AI_SETTINGS_PERSISTENT_STORE_NAME, 'readonly')
      .objectStore(AI_SETTINGS_PERSISTENT_STORE_NAME).get('default'));
    const stored = isJsonObject(row) && typeof row.value === 'string' ? row.value : null;
    return { settings: stored ?? storage.getItem('openflowkit-ai-settings'), secret: storage.getItem('openflowkit-ai-settings-secret') };
  } finally {
    database.close();
  }
}

/** 12.1's "Export all my diagrams" file; v2 writes it too and opens it as a multi-document import. */
export const V1_BACKUP_FORMAT = 'openflowkit-v1-backup';

export interface V1Backup {
  readonly format: typeof V1_BACKUP_FORMAT;
  readonly version: 1;
  readonly exportedAt: string;
  readonly documents: readonly JsonObject[];
}

// As 12.1 writes it: undo history left behind, images inline (asset ids only resolve here).
async function backupContent(content: JsonObject): Promise<JsonObject> {
  const { history: _history, ...rest } = content;
  const nodes = Array.isArray(rest.nodes) ? rest.nodes : [];
  return { ...rest, nodes: await Promise.all(nodes.map(async (node) =>
    isJsonObject(node) && isJsonObject(node.data) ? { ...node, data: await inlineAssets(node.data, true) } : node)) };
}

/** Every live v1 diagram in this browser, read-only, in the 12.1 backup format. The permanent stand-in for Classic. */
export async function buildV1Backup(factory: IDBFactory, storage: Storage, now = new Date()): Promise<V1Backup> {
  // v1 read its localStorage copies whenever IndexedDB would not open, so the backup does too.
  // Not the boot import: a blocked open (a v1 tab still holding the database) is often transient,
  // and importing the localStorage strays then would list them for good.
  const sources = await readV1Sources(factory, storage)
    .catch(() => ({ documents: [], fallback: storage.getItem(V1_FALLBACK_KEY), tabStates: [storage.getItem(V1_ZUSTAND_KEY)] }));
  const rows = legacyWorkspaceRows(sources);
  const documents = await Promise.all(rows.map(async (row) => ({
    ...row,
    ...(isJsonObject(row.content) ? { content: await backupContent(row.content) } : {}),
    ...(Array.isArray(row.pages) ? { pages: await Promise.all(row.pages.map(async (page) =>
      isJsonObject(page) && isJsonObject(page.content) ? { ...page, content: await backupContent(page.content) } : page)) } : {}),
  })));
  return { format: V1_BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), documents };
}

export function isV1Backup(value: unknown): value is V1Backup {
  return isJsonObject(value) && value.format === V1_BACKUP_FORMAT && Array.isArray(value.documents);
}

export interface V1BackupOpenReport {
  readonly opened: readonly string[];
  /** Already in this browser (an earlier import or open); the copy here is kept. */
  readonly existing: number;
  readonly failures: readonly LegacyImportFailure[];
}

/** Opens every diagram in a backup file as `v1-<id>`, the same id the boot import gives it. */
export async function openV1Backup(backup: V1Backup, repository: V2DocumentRepository): Promise<V1BackupOpenReport> {
  if (backup.version !== 1) {
    return { opened: [], existing: 0, failures: [{ v1Id: '', name: 'backup', error: `Backup version ${String(backup.version)} is newer than this OpenFlowKit.` }] };
  }
  const workspace = await migrateLegacyWorkspace({ documents: backup.documents, fallback: null, tabStates: [] }, {
    resolveNodeSize: defaultLegacyNodeSize,
    convertMermaid: legacyMermaidConverter({ layout: elkDslLayoutPort }),
  });
  const opened: string[] = [];
  let existing = 0;
  const failures = [...workspace.failures];
  for (const document of workspace.documents) {
    try {
      const result = await repository.saveDocument(document.id, document, 1);
      if (result.status === 'saved') opened.push(document.id);
      else existing += 1;
    } catch (error) {
      failures.push({ v1Id: document.id.slice('v1-'.length), name: document.name, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { opened, existing, failures };
}

let running: Promise<V1ImportReport> | null = null;

/** One import per page load; later callers (an old `#/flow/` link) await the same run. A failed run can be retried. */
export function runV1Import(): Promise<V1ImportReport> {
  running ??= Promise.resolve()
    .then(() => importV1Workspace({
      factory: getIndexedDbFactory(),
      storage: localStorage,
      repository: createV2Repository(getIndexedDbFactory()),
      now: () => new Date().toISOString(),
    }))
    .catch((error: unknown) => {
      running = null;
      throw error;
    });
  return running;
}
