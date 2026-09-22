import { ASSETS_STORE_NAME } from './indexedDbSchema';
import { getIndexedDbFactory, getRecord, putRecord, withDatabase } from './indexedDbHelpers';

// Image bytes live in the IndexedDB `assets` store; nodes keep only the id.
// ponytail: a data URL in the record, not a Blob — it survives JSON export
// inline and needs no object-URL lifecycle. Fine to ~10 MB per image; upgrade
// path is a Blob record plus a revoked object URL in the media layer.
export interface StoredAsset {
  readonly id: string;
  readonly dataUrl: string;
  readonly name: string;
  readonly mime: string;
}

const MAX_ASSET_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = MAX_ASSET_BYTES;

export function assetBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function putImageAsset(dataUrl: string, name: string, mime: string): Promise<string> {
  if (assetBytes(dataUrl) > MAX_ASSET_BYTES) {
    throw new RangeError(`Image is larger than ${MAX_ASSET_BYTES / 1024 / 1024} MB.`);
  }
  const id = `asset-${crypto.randomUUID()}`;
  await withDatabase((database) =>
    putRecord<StoredAsset>(database, ASSETS_STORE_NAME, { id, dataUrl, name, mime }));
  return id;
}

export async function readAssetUrl(id: string): Promise<string | null> {
  const factory = getIndexedDbFactory();
  if (!factory) return null;
  return withDatabase(async (database) => {
    const asset = await getRecord<StoredAsset>(database, ASSETS_STORE_NAME, id);
    return asset?.dataUrl ?? null;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];

export function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.includes(file.type);
}
