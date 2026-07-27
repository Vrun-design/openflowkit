export type FlowAssetKind = 'image' | 'icon' | 'svg';

export interface FlowAsset {
  id: string;
  kind: FlowAssetKind;
  mimeType: string;
  /** Raw asset bytes. IndexedDB stores Blob natively. */
  bytes: Blob;
  byteLength: number;
  width?: number;
  height?: number;
  createdAt: string;
  sourceName?: string;
}

export type AssetIngestKind = 'image' | 'icon';

export interface AssetIngestResult {
  /** Content-addressed asset id when stored in the asset store. */
  assetId?: string;
  /**
   * Immediate display URL for the canvas.
   * When the asset store is used this is typically a blob: URL from the cache.
   * When the store is disabled (or fails), this is a data: URL.
   */
  displayUrl: string;
  mimeType: string;
  byteLength: number;
  width?: number;
  height?: number;
}

export interface AssetEncodeOptions {
  kind: AssetIngestKind;
  maxLongEdgePx: number;
  maxBytes: number;
  preferWebp: boolean;
}

export const ASSET_ENCODE_DEFAULTS: Record<AssetIngestKind, AssetEncodeOptions> = {
  image: {
    kind: 'image',
    maxLongEdgePx: 2048,
    maxBytes: 4 * 1024 * 1024,
    preferWebp: true,
  },
  icon: {
    kind: 'icon',
    maxLongEdgePx: 512,
    maxBytes: 1 * 1024 * 1024,
    preferWebp: true,
  },
};
