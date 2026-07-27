import {
  ASSET_ENCODE_DEFAULTS,
  type AssetEncodeOptions,
  type AssetIngestKind,
} from './assetTypes';

export class AssetEncodeError extends Error {
  readonly code: 'TOO_LARGE' | 'UNSUPPORTED' | 'ENCODE_FAILED';

  constructor(code: AssetEncodeError['code'], message: string) {
    super(message);
    this.name = 'AssetEncodeError';
    this.code = code;
  }
}

export interface EncodedAssetBytes {
  blob: Blob;
  mimeType: string;
  byteLength: number;
  width?: number;
  height?: number;
}

function isSvgMime(mimeType: string, fileName?: string): boolean {
  if (mimeType.includes('svg')) {
    return true;
  }
  return Boolean(fileName?.toLowerCase().endsWith('.svg'));
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

async function loadImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  // Fallback for environments without createImageBitmap (rare in modern browsers).
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new AssetEncodeError('ENCODE_FAILED', 'Failed to decode image.'));
      element.src = objectUrl;
    });

    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(image);
    }

    // Last resort: draw via canvas using the HTMLImageElement dimensions.
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new AssetEncodeError('ENCODE_FAILED', 'Canvas 2D context is unavailable.');
    }
    context.drawImage(image, 0, 0);
    const fallbackBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
            return;
          }
          reject(new AssetEncodeError('ENCODE_FAILED', 'Failed to encode canvas fallback.'));
        },
        'image/png'
      );
    });
    return createImageBitmap(fallbackBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function computeScaledSize(
  width: number,
  height: number,
  maxLongEdgePx: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdgePx || longEdge === 0) {
    return { width, height };
  }
  const scale = maxLongEdgePx / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasEncode(
  source: CanvasImageSource,
  width: number,
  height: number,
  preferWebp: boolean
): Promise<{ blob: Blob; mimeType: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new AssetEncodeError('ENCODE_FAILED', 'Canvas 2D context is unavailable.');
  }
  context.drawImage(source, 0, 0, width, height);

  const tryMimeTypes = preferWebp
    ? (['image/webp', 'image/jpeg', 'image/png'] as const)
    : (['image/jpeg', 'image/png'] as const);

  for (const mimeType of tryMimeTypes) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), mimeType, mimeType === 'image/png' ? undefined : 0.88);
    });
    if (blob && blob.size > 0) {
      return { blob, mimeType: blob.type || mimeType };
    }
  }

  throw new AssetEncodeError('ENCODE_FAILED', 'Browser could not encode the image.');
}

/**
 * Normalize a user-selected image/icon file for storage.
 * SVGs are kept as-is (with size check). Rasters are resized and re-encoded.
 */
export async function encodeUserMediaFile(
  file: Blob,
  kind: AssetIngestKind,
  options: Partial<AssetEncodeOptions> = {},
  fileName?: string
): Promise<EncodedAssetBytes> {
  const defaults = ASSET_ENCODE_DEFAULTS[kind];
  const resolved: AssetEncodeOptions = {
    ...defaults,
    ...options,
    kind,
  };

  const mimeType = file.type || 'application/octet-stream';

  if (isSvgMime(mimeType, fileName)) {
    if (file.size > resolved.maxBytes) {
      throw new AssetEncodeError(
        'TOO_LARGE',
        `SVG exceeds the ${Math.round(resolved.maxBytes / (1024 * 1024))}MB limit.`
      );
    }
    return {
      blob: file,
      mimeType: mimeType.includes('svg') ? mimeType : 'image/svg+xml',
      byteLength: file.size,
    };
  }

  if (!mimeType.startsWith('image/')) {
    throw new AssetEncodeError('UNSUPPORTED', `Unsupported media type: ${mimeType}`);
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await loadImageBitmap(file);
    const scaled = computeScaledSize(bitmap.width, bitmap.height, resolved.maxLongEdgePx);
    const encoded = await canvasEncode(bitmap, scaled.width, scaled.height, resolved.preferWebp);

    if (encoded.blob.size > resolved.maxBytes) {
      throw new AssetEncodeError(
        'TOO_LARGE',
        `Encoded image exceeds the ${Math.round(resolved.maxBytes / (1024 * 1024))}MB limit.`
      );
    }

    return {
      blob: encoded.blob,
      mimeType: encoded.mimeType,
      byteLength: encoded.blob.size,
      width: scaled.width,
      height: scaled.height,
    };
  } catch (error) {
    if (error instanceof AssetEncodeError) {
      throw error;
    }
    // If decode/resize fails, fall back to the original bytes when small enough.
    if (file.size <= resolved.maxBytes) {
      return {
        blob: file,
        mimeType,
        byteLength: file.size,
      };
    }
    throw new AssetEncodeError(
      'ENCODE_FAILED',
      error instanceof Error ? error.message : 'Failed to process image.'
    );
  } finally {
    bitmap?.close?.();
  }
}

export async function encodeDataUrl(
  dataUrl: string,
  kind: AssetIngestKind
): Promise<EncodedAssetBytes> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new AssetEncodeError('ENCODE_FAILED', 'Failed to parse data URL.');
  }
  const blob = await response.blob();
  return encodeUserMediaFile(blob, kind);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new AssetEncodeError('ENCODE_FAILED', 'Failed to parse data URL.');
  }
  return response.blob();
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blobToArrayBuffer(blob);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  const mimeType = blob.type || 'application/octet-stream';
  return `data:${mimeType};base64,${base64}`;
}

export function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:');
}
