import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import {
  ASSETS_STORE_NAME,
  openFlowPersistenceDatabase,
} from './indexedDbSchema';
import {
  deleteRecord,
  getAllRecords,
  getIndexedDbFactory,
  getRecord,
  putRecord,
  withDatabase,
} from './indexedDbHelpers';
import { ensureStorageSchemaReady, getBrowserIndexedDbFactory } from './storageRuntime';
import { reportStorageTelemetry } from './storageTelemetry';
import { hashBytesToAssetId, isAssetId } from './assetHash';
import {
  AssetEncodeError,
  blobToDataUrl,
  encodeUserMediaFile,
  isDataUrl,
} from './assetEncode';
import type {
  AssetIngestKind,
  AssetIngestResult,
  FlowAsset,
  FlowAssetKind,
} from './assetTypes';

const blobUrlCache = new Map<string, string>();

function kindToAssetKind(kind: AssetIngestKind): FlowAssetKind {
  return kind === 'icon' ? 'icon' : 'image';
}

function revokeCachedUrl(assetId: string): void {
  const existing = blobUrlCache.get(assetId);
  if (existing) {
    URL.revokeObjectURL(existing);
    blobUrlCache.delete(assetId);
  }
}

export function isAssetStoreEnabled(): boolean {
  return ROLLOUT_FLAGS.assetStoreV1;
}

export async function putFlowAsset(asset: FlowAsset): Promise<void> {
  await ensureStorageSchemaReady(getBrowserIndexedDbFactory());
  await withDatabase(async (database) => {
    await putRecord(database, ASSETS_STORE_NAME, asset);
  });
}

export async function getFlowAsset(assetId: string): Promise<FlowAsset | null> {
  if (!isAssetId(assetId)) {
    return null;
  }

  await ensureStorageSchemaReady(getBrowserIndexedDbFactory());
  try {
    return await withDatabase(async (database) => {
      return getRecord<FlowAsset>(database, ASSETS_STORE_NAME, assetId);
    });
  } catch (error) {
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_READ_FAILED',
      severity: 'warning',
      message: `Failed to read asset ${assetId}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

export async function deleteFlowAsset(assetId: string): Promise<void> {
  revokeCachedUrl(assetId);
  await ensureStorageSchemaReady(getBrowserIndexedDbFactory());
  await withDatabase(async (database) => {
    await deleteRecord(database, ASSETS_STORE_NAME, assetId);
  });
}

export async function listFlowAssets(): Promise<FlowAsset[]> {
  await ensureStorageSchemaReady(getBrowserIndexedDbFactory());
  return withDatabase(async (database) => {
    return getAllRecords<FlowAsset>(database, ASSETS_STORE_NAME);
  });
}

/**
 * Resolve an asset id to a displayable URL (cached blob: URL).
 * Returns null when the asset is missing or the store is unavailable.
 */
export async function resolveAssetDisplayUrl(assetId: string): Promise<string | null> {
  if (!isAssetId(assetId)) {
    return null;
  }

  const cached = blobUrlCache.get(assetId);
  if (cached) {
    return cached;
  }

  const asset = await getFlowAsset(assetId);
  if (!asset?.bytes) {
    return null;
  }

  const url = URL.createObjectURL(asset.bytes);
  blobUrlCache.set(assetId, url);
  return url;
}

/**
 * Drop blob URLs that are no longer referenced. Safe to call from GC.
 */
export function clearAssetUrlCache(assetIds?: string[]): void {
  if (!assetIds) {
    for (const [assetId, url] of blobUrlCache) {
      URL.revokeObjectURL(url);
      blobUrlCache.delete(assetId);
    }
    return;
  }

  for (const assetId of assetIds) {
    revokeCachedUrl(assetId);
  }
}

export async function putEncodedAsset(input: {
  blob: Blob;
  mimeType: string;
  kind: FlowAssetKind;
  width?: number;
  height?: number;
  sourceName?: string;
}): Promise<FlowAsset> {
  const buffer = await input.blob.arrayBuffer();
  const id = await hashBytesToAssetId(buffer);
  const existing = await getFlowAsset(id);
  if (existing) {
    return existing;
  }

  const asset: FlowAsset = {
    id,
    kind: input.kind,
    mimeType: input.mimeType,
    bytes: input.blob,
    byteLength: input.blob.size,
    width: input.width,
    height: input.height,
    createdAt: new Date().toISOString(),
    sourceName: input.sourceName,
  };

  await putFlowAsset(asset);
  return asset;
}

/**
 * Ingest a user file into the asset store (when enabled) or as a data URL (legacy).
 */
export async function ingestUserMediaFile(
  file: File | Blob,
  kind: AssetIngestKind,
  options?: { fileName?: string }
): Promise<AssetIngestResult> {
  const fileName = options?.fileName ?? (file instanceof File ? file.name : undefined);
  const encoded = await encodeUserMediaFile(file, kind, {}, fileName);

  if (!isAssetStoreEnabled() || !getIndexedDbFactory()) {
    return {
      displayUrl: await blobToDataUrl(encoded.blob),
      mimeType: encoded.mimeType,
      byteLength: encoded.byteLength,
      width: encoded.width,
      height: encoded.height,
    };
  }

  try {
    const asset = await putEncodedAsset({
      blob: encoded.blob,
      mimeType: encoded.mimeType,
      kind: kindToAssetKind(kind),
      width: encoded.width,
      height: encoded.height,
      sourceName: fileName,
    });
    const displayUrl = await resolveAssetDisplayUrl(asset.id);
    return {
      assetId: asset.id,
      displayUrl: displayUrl ?? (await blobToDataUrl(encoded.blob)),
      mimeType: encoded.mimeType,
      byteLength: encoded.byteLength,
      width: encoded.width,
      height: encoded.height,
    };
  } catch (error) {
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_WRITE_FAILED',
      severity: 'warning',
      message: `Asset store write failed; falling back to data URL. ${error instanceof Error ? error.message : String(error)}`,
    });
    return {
      displayUrl: await blobToDataUrl(encoded.blob),
      mimeType: encoded.mimeType,
      byteLength: encoded.byteLength,
      width: encoded.width,
      height: encoded.height,
    };
  }
}

/**
 * Ingest an existing data URL into the asset store. Used by lazy migration.
 * Returns null when the value is not a data URL or the store is disabled.
 */
export async function ingestDataUrlAsAsset(
  dataUrl: string,
  kind: AssetIngestKind
): Promise<AssetIngestResult | null> {
  if (!isDataUrl(dataUrl) || !isAssetStoreEnabled() || !getIndexedDbFactory()) {
    return null;
  }

  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return ingestUserMediaFile(blob, kind);
  } catch (error) {
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_MIGRATE_FAILED',
      severity: 'warning',
      message: `Failed to migrate data URL into asset store: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

/**
 * Delete assets that are not referenced by any of the provided ids.
 * Returns the number of deleted assets.
 *
 * ponytail: deliberately not called on save. Assets are referenced from more places
 * than the live canvas — every document page, each page's undo/redo history, and
 * saved snapshots — so a caller that enumerates fewer than all of them permanently
 * deletes user images. Until a single collector covers all four, unreferenced bytes
 * are left on disk: bounded by what the user uploaded, deduped by content hash, and
 * still far smaller than the inline data URLs this replaced.
 */
export async function garbageCollectUnreferencedAssets(
  referencedAssetIds: Iterable<string>
): Promise<number> {
  if (!isAssetStoreEnabled() || !getIndexedDbFactory()) {
    return 0;
  }

  const referenced = new Set(
    Array.from(referencedAssetIds).filter((id) => isAssetId(id))
  );

  try {
    const all = await listFlowAssets();
    const orphaned = all.filter((asset) => !referenced.has(asset.id));
    await Promise.all(orphaned.map((asset) => deleteFlowAsset(asset.id)));
    return orphaned.length;
  } catch (error) {
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_GC_FAILED',
      severity: 'warning',
      message: `Asset GC failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return 0;
  }
}

export function isAssetStoreAvailable(): boolean {
  return isAssetStoreEnabled() && Boolean(getIndexedDbFactory());
}

export { AssetEncodeError, isAssetId, isDataUrl };

/** Test helper: open the assets store via the shared schema (used by tests). */
export async function openAssetsDatabaseForTests(): Promise<IDBDatabase> {
  const factory = getBrowserIndexedDbFactory();
  if (!factory) {
    throw new Error('IndexedDB is not available.');
  }
  await ensureStorageSchemaReady(factory);
  return openFlowPersistenceDatabase(factory);
}
