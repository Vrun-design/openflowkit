function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Content-addressed asset id: `sha256:<hex>`.
 * Falls back to a length+prefix hash when SubtleCrypto is unavailable (rare).
 */
export async function hashBytesToAssetId(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes);

  // Copy into a fresh ArrayBuffer so SubtleCrypto always receives a plain ArrayBuffer
  // (avoids SharedArrayBuffer / ArrayBufferLike typing issues).
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);

  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
    return `sha256:${toHex(digest)}`;
  }

  // Deterministic fallback for non-secure contexts / test environments without subtle.
  let hash = 2166136261;
  for (let index = 0; index < copy.length; index += 1) {
    hash ^= copy[index];
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return `fnv1a:${unsigned.toString(16).padStart(8, '0')}:${copy.byteLength}`;
}

export function isAssetId(value: unknown): value is string {
  return typeof value === 'string' && /^(sha256|fnv1a):[a-f0-9:]+$/i.test(value.trim());
}
