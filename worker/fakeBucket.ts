import type { R2BucketLike } from './index';

/** In-memory stand-in with R2's return shapes: put resolves an object, get/head resolve null when missing, delete resolves undefined. */
export class FakeBucket implements R2BucketLike {
  readonly objects = new Map<string, { bytes: Uint8Array; customMetadata: Record<string, string> }>();
  async put(key: string, value: ArrayBuffer | Uint8Array, options?: { customMetadata?: Record<string, string> }) {
    this.objects.set(key, { bytes: new Uint8Array(value instanceof Uint8Array ? value : new Uint8Array(value)), customMetadata: options?.customMetadata ?? {} });
    return { key };
  }
  async get(key: string) {
    const found = this.objects.get(key);
    if (!found) return null;
    return { size: found.bytes.length, customMetadata: found.customMetadata, body: new Blob([found.bytes as BlobPart]).stream() as ReadableStream<Uint8Array> };
  }
  async head(key: string) {
    const found = this.objects.get(key);
    return found ? { size: found.bytes.length, customMetadata: found.customMetadata } : null;
  }
  async delete(key: string) { this.objects.delete(key); }
}
