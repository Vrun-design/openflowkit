import { legacyMermaidConverter } from '@/opencanvas/application/dsl/legacyMermaid';
import { isJsonObject } from '@/opencanvas/domain/document/json';
import { migrateLegacyWorkspace, type LegacyImportFailure, type LegacyWorkspaceSources } from '@/opencanvas/domain/document/legacyWorkspace';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { elkDslLayoutPort } from '../../dsl/elkLayoutPort';
import { readAssetUrl } from '../assets';
import { getIndexedDbFactory, requestToPromise } from '../indexedDbHelpers';
import {
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
  readonly importedAt: string;
  readonly sourceUpdatedAt: string;
  readonly status: 'imported' | 'failed';
  readonly error?: string;
}

export interface V1ImportMarker {
  readonly completedAt: string;
  readonly docs: Readonly<Record<string, V1ImportEntry>>;
}

export interface V1ImportReport {
  /** v2 ids written by this run, most recently edited in v1 first. */
  readonly imported: readonly string[];
  readonly failures: readonly LegacyImportFailure[];
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

// v1 image nodes keep only an id into the shared `assets` store; v2 exports inline
// `imageUrl`. Copying the bytes into the document makes the import self-contained.
async function inlineImages(document: SceneDocumentV1): Promise<SceneDocumentV1> {
  const pages = await Promise.all(document.pages.map(async (page) => ({
    ...page,
    nodes: await Promise.all(page.nodes.map(async (node) => {
      const assetId = node.content.imageAssetId;
      if (typeof assetId !== 'string' || typeof node.content.imageUrl === 'string') return node;
      const url = await readAssetUrl(assetId).catch(() => null);
      return url ? { ...node, content: { ...node.content, imageUrl: url } } : node;
    })),
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
  const marker = readV1ImportMarker(deps.storage);
  // v1 is gone after the cutover, so its rows can't change: a clean marker means nothing to do.
  if (!deps.factory || (marker && Object.values(marker.docs).every((entry) => entry.status === 'imported'))) {
    return { imported: [], failures: [] };
  }
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
    docs[failure.v1Id] = { importedAt, sourceUpdatedAt: '', status: 'failed', error: failure.error };
  }
  const newestFirst = [...workspace.documents].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  for (const [v1Id, document] of newestFirst.map((item) => [item.id.slice('v1-'.length), item] as const)) {
    try {
      // Revision 1 never overwrites: an existing copy (maybe edited in v2) comes back `stale` and stays.
      const result = await deps.repository.saveDocument(document.id, await inlineImages(document), 1);
      if (result.status === 'saved') imported.push(document.id);
      docs[v1Id] = { importedAt, sourceUpdatedAt: document.updatedAt, status: 'imported' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ v1Id, name: document.name, error: message });
      docs[v1Id] = { importedAt, sourceUpdatedAt: document.updatedAt, status: 'failed', error: message };
    }
  }
  const next: V1ImportMarker = { completedAt: importedAt, docs };
  // ponytail: a full localStorage loses the marker, so every boot re-reads v1 (saves stay no-ops,
  // but a v1-* doc deleted in v2 returns) — move the marker into IndexedDB if that shows up.
  try { deps.storage.setItem(V1_IMPORT_MARKER_KEY, JSON.stringify(next)); } catch { /* see above */ }
  return { imported, failures };
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
