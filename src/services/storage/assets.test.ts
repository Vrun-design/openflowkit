// @vitest-environment node
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { putRecord, withDatabase } from './indexedDbHelpers';
import { ASSETS_STORE_NAME } from './indexedDbSchema';
import { putImageAsset, readAssetUrl } from './assets';

describe('image assets', () => {
  it('reads back an image v2 stored', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const id = await putImageAsset(dataUrl, 'dot.png', 'image/png');
    expect(await readAssetUrl(id)).toBe(dataUrl);
  });

  // v1 shares the `assets` store but keeps `bytes: Blob` (phase 12.0 capture).
  it('reads a v1 asset row as a data URL', async () => {
    const fixture = JSON.parse(readFileSync('src/services/storage/v2/__fixtures__/v1/indexeddb.json', 'utf8'));
    const { bytes, ...row } = fixture.indexedDb.assets[0];
    const base64 = bytes.$blob.slice(bytes.$blob.indexOf(',') + 1);
    const blob = new Blob([Buffer.from(base64, 'base64')], { type: row.mimeType });
    await withDatabase((database) => putRecord(database, ASSETS_STORE_NAME, { ...row, bytes: blob }));

    expect(await readAssetUrl(row.id)).toBe(bytes.$blob);
  });
});
