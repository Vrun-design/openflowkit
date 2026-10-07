import { serializeCanonicalJson } from '../../opencanvas/infrastructure/export/canonicalJson';
import { migrateSceneDocument } from '../../opencanvas/domain/document/migration';
import type { SceneDocumentV1 } from '../../opencanvas/domain/document/types';

/**
 * Share envelope: `[version: 1 byte][iv: 12 bytes][AES-GCM ciphertext + tag]`.
 * The version byte is plaintext but authenticated (GCM additional data), so flipping it fails
 * decryption instead of opening the body under a different format. The plaintext is the canonical
 * document JSON, so the document's own schema migration still applies to old links.
 * The 256-bit key travels only in the URL fragment, which browsers never send to a server.
 */
export const SHARE_ENVELOPE_VERSION = 1;
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type ShareCryptoErrorCode = 'bad-key' | 'unknown-version' | 'corrupt' | 'decrypt-failed' | 'invalid-document';

export class ShareCryptoError extends Error {
  constructor(readonly code: ShareCryptoErrorCode, message: string) {
    super(message);
    this.name = 'ShareCryptoError';
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importKey(raw: Uint8Array<ArrayBuffer>, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [usage]);
}

export async function encryptDocument(document: SceneDocumentV1): Promise<{ body: Uint8Array; key: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(serializeCanonicalJson(document));
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new Uint8Array([SHARE_ENVELOPE_VERSION]) },
    await importKey(raw, 'encrypt'), plaintext,
  ));
  const body = new Uint8Array(1 + IV_BYTES + cipher.length);
  body[0] = SHARE_ENVELOPE_VERSION;
  body.set(iv, 1);
  body.set(cipher, 1 + IV_BYTES);
  return { body, key: toBase64Url(raw) };
}

export async function decryptDocument(body: Uint8Array, key: string): Promise<SceneDocumentV1> {
  const raw = fromBase64Url(key);
  if (!raw || raw.length !== KEY_BYTES) {
    throw new ShareCryptoError('bad-key', 'The link’s key is incomplete. Ask for the full link again.');
  }
  if (body.length === 0) throw new ShareCryptoError('corrupt', 'This link’s data is empty or damaged.');
  const version = body[0];
  if (version !== SHARE_ENVELOPE_VERSION) {
    throw new ShareCryptoError('unknown-version',
      'This link was made by a different version of OpenFlowKit. Update the app, or ask for a new link.');
  }
  if (body.length < 1 + IV_BYTES + 16) throw new ShareCryptoError('corrupt', 'This link’s data is empty or damaged.');
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: body.slice(1, 1 + IV_BYTES), additionalData: new Uint8Array([version]) },
      await importKey(raw, 'decrypt'), body.slice(1 + IV_BYTES),
    );
  } catch {
    throw new ShareCryptoError('decrypt-failed',
      'This link couldn’t be unlocked. The key doesn’t match, or the data was changed. Ask for the link again.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new ShareCryptoError('invalid-document', 'This link doesn’t hold an OpenFlowKit diagram.');
  }
  const migrated = migrateSceneDocument(parsed);
  if (migrated.success === false) {
    throw new ShareCryptoError('invalid-document', migrated.reason === 'newer-schema'
      ? 'This diagram was shared from a newer OpenFlowKit. Update the app to open it.'
      : 'This link doesn’t hold a valid OpenFlowKit diagram.');
  }
  return migrated.document;
}
