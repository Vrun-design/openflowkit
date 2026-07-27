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
 * Throws when SubtleCrypto is unavailable (insecure origin) rather than falling
 * back to a 32-bit hash — ids are used for dedupe, so a collision would serve the
 * wrong image. Callers treat the throw as "asset store unusable" and keep data URLs.
 */
export async function hashBytesToAssetId(bytes: ArrayBuffer | Uint8Array): Promise<string> {
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes);

  // Copy so a SharedArrayBuffer-backed view can't reach digest().
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);

  if (!(typeof crypto !== 'undefined' && crypto.subtle?.digest)) {
    throw new Error('SubtleCrypto is unavailable; cannot content-address assets.');
  }

  // Pass the typed array, not `copy.buffer`: the ArrayBuffer identity check is
  // realm-sensitive, so a buffer minted under jsdom fails Node 20's webcrypto
  // validation. A view passes on every runtime.
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return `sha256:${toHex(digest)}`;
}

export function isAssetId(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/i.test(value.trim());
}
