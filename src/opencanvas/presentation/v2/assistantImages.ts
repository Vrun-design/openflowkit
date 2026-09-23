// Images attached to an assistant message: checked, downscaled to what vision
// models actually read (Claude's guidance: ≤ 1568px on the long edge), and
// encoded as base64 so every provider wire and localStorage can carry them.
import type { ChatImage } from './assistantChats';

export const MAX_IMAGES = 4;
const MAX_EDGE = 1568;
// Kept as-is when already small; everything else is re-encoded.
const PASSTHROUGH = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const PASSTHROUGH_BYTES = 1_500_000;

/** The size to draw at: the long edge capped at `max`, aspect kept, never upscaled. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const base64Of = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
  reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'));
  reader.readAsDataURL(blob);
});

/** Throws a sentence the composer shows when the file is not a usable image. */
export async function prepareImage(file: File): Promise<ChatImage> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name || 'That file'} is not an image.`);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error(`${file.name || 'That image'} could not be read.`); });
    const size = fitWithin(image.naturalWidth, image.naturalHeight);
    if (size.width === image.naturalWidth && PASSTHROUGH.has(file.type) && file.size <= PASSTHROUGH_BYTES) {
      return { name: file.name, mediaType: file.type, data: await base64Of(file) };
    }
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, size.width, size.height);
    // WebP keeps transparency at a fraction of PNG's size; browsers that cannot encode it hand back PNG.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob) throw new Error(`${file.name || 'That image'} could not be encoded.`);
    return { name: file.name, mediaType: blob.type || 'image/png', data: await base64Of(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
