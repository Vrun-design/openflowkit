import type { SceneDocumentV1 } from '../../opencanvas/domain/document/types';
import { decryptDocument, encryptDocument, ShareCryptoError } from './shareCrypto';

/** The one place the share endpoint is named. */
export const SHARE_ORIGIN: string = import.meta.env.VITE_SHARE_ORIGIN ?? 'https://share.openflowkit.com';
/** Same ceiling as the Worker's (worker/index.ts); checked here first so an oversize document never leaves the browser. */
export const MAX_SHARE_BYTES = 1_048_576;

export type ShareErrorCode = 'too-large' | 'offline' | 'unreachable' | 'turnstile' | 'rate-limited' | 'not-found' | 'server' | 'forbidden' | 'no-site-key';

export class ShareError extends Error {
  constructor(readonly code: ShareErrorCode, message: string) {
    super(message);
    this.name = 'ShareError';
  }
}

async function call(fetcher: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetcher(url, init);
  } catch {
    // A failed fetch while the browser says it is online is the service's fault, not the user's connection.
    if (globalThis.navigator?.onLine === false) throw new ShareError('offline', 'You’re offline. Check your connection and try again.');
    throw new ShareError('unreachable', 'The share service isn’t reachable right now.');
  }
}

export async function uploadShare(
  body: Uint8Array, turnstileToken: string, origin = SHARE_ORIGIN, fetcher: typeof fetch = fetch,
): Promise<{ id: string; deleteToken: string }> {
  const response = await call(fetcher, `${origin}/s`, { method: 'POST', body, headers: { 'X-Turnstile-Token': turnstileToken } });
  if (response.status === 413) throw new ShareError('too-large', 'This diagram is too big to share as a link.');
  if (response.status === 403) throw new ShareError('turnstile', 'The human check failed. Try again.');
  if (response.status === 429) throw new ShareError('rate-limited', 'Too many links from this network. Wait a minute and try again.');
  if (response.status !== 201) throw new ShareError('server', `The share service failed (${response.status}). Try again later.`);
  return await response.json() as { id: string; deleteToken: string };
}

export async function downloadShare(id: string, origin = SHARE_ORIGIN, fetcher: typeof fetch = fetch): Promise<Uint8Array> {
  const response = await call(fetcher, `${origin}/s/${id}`, { method: 'GET' });
  if (response.status === 404) throw new ShareError('not-found', 'This link was deleted or never existed.');
  if (!response.ok) throw new ShareError('server', `The share service failed (${response.status}). Try again later.`);
  return new Uint8Array(await response.arrayBuffer());
}

/** An already-deleted link counts as deleted. */
export async function deleteShare(id: string, deleteToken: string, origin = SHARE_ORIGIN, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await call(fetcher, `${origin}/s/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${deleteToken}` } });
  if (response.status === 204 || response.status === 404) return;
  if (response.status === 403) throw new ShareError('forbidden', 'This browser can’t delete that link.');
  throw new ShareError('server', `The share service failed (${response.status}).`);
}

/**
 * Link format: `<app>/#/s/<id>/<key>`. The key (base64url, 43 chars) is the last path segment of the
 * fragment, so it is never sent to any server. Path form, not `?k=`, so the hash router parses it unaided.
 */
export function shareLink(appUrl: string, id: string, key: string): string {
  return `${appUrl.split('#')[0]}#/s/${id}/${key}`;
}

export interface SharedLink { readonly url: string; readonly id: string; readonly deleteToken: string }

export async function createShareLink(
  document: SceneDocumentV1,
  deps: { appUrl: string; getTurnstileToken: () => Promise<string>; origin?: string; fetcher?: typeof fetch },
): Promise<SharedLink> {
  const { body, key } = await encryptDocument(document);
  if (body.length > MAX_SHARE_BYTES) throw new ShareError('too-large', 'This diagram is too big to share as a link.');
  const { id, deleteToken } = await uploadShare(body, await deps.getTurnstileToken(), deps.origin, deps.fetcher);
  return { url: shareLink(deps.appUrl, id, key), id, deleteToken };
}

export interface SharedProblem {
  readonly title: string;
  readonly detail: string;
  /** Worth offering Retry: the cause may pass. */
  readonly retry: boolean;
}

/** What the viewer opens: the document, or a reason in plain words. */
export async function loadSharedDocument(
  id: string, key: string | undefined, origin = SHARE_ORIGIN, fetcher: typeof fetch = fetch,
): Promise<{ document: SceneDocumentV1 } | { problem: SharedProblem }> {
  if (!key) {
    return { problem: { title: 'This link is missing its key.', detail: 'The end of the link was cut off when it was copied. Ask for the full link again.', retry: false } };
  }
  try {
    return { document: await decryptDocument(await downloadShare(id, origin, fetcher), key) };
  } catch (error) {
    if (error instanceof ShareError) {
      return { problem: error.code === 'not-found'
        ? { title: 'This link has been deleted.', detail: 'Whoever shared it removed it, or it never existed.', retry: false }
        : error.code === 'offline'
          ? { title: 'You’re offline.', detail: 'Shared diagrams open when you’re connected.', retry: true }
          : error.code === 'unreachable'
            ? { title: error.message, detail: 'Try again in a minute.', retry: true }
            : { title: 'The share service didn’t answer.', detail: error.message, retry: true } };
    }
    if (error instanceof ShareCryptoError) {
      return { problem: {
        title: error.code === 'bad-key' ? 'This link’s key is incomplete.'
          : error.code === 'unknown-version' ? 'This link needs a different version.'
            : 'This link couldn’t be opened.',
        detail: error.message, retry: false,
      } };
    }
    throw error;
  }
}

// Share ids and delete tokens kept here so the creator can delete a link later. Storage can be blocked
// (SecurityError) or hold anything, so every read is guarded and a bad value reads as "no links".
const TOKENS_KEY = 'ofk-shares';
type TokenMap = Record<string, { docId: string; deleteToken: string }>;

/** `window.localStorage`, or null where touching it throws. */
export function browserStorage(scope: { readonly localStorage: Storage } = window): Storage | null {
  try { return scope.localStorage; } catch { return null; }
}

function readTokens(storage: Storage | null): TokenMap {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(TOKENS_KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) =>
      typeof entry === 'object' && entry !== null
      && typeof (entry as TokenMap[string]).docId === 'string' && typeof (entry as TokenMap[string]).deleteToken === 'string'));
  } catch { return {}; }
}

function writeTokens(storage: Storage | null, tokens: TokenMap): void {
  try { storage?.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch { /* storage blocked or full: the link just can't be deleted later */ }
}

export function rememberShare(storage: Storage | null, docId: string, id: string, deleteToken: string): void {
  writeTokens(storage, { ...readTokens(storage), [id]: { docId, deleteToken } });
}

/** The newest link this browser made for the document, if it still holds its delete token. */
export function latestShareFor(storage: Storage | null, docId: string): { id: string; deleteToken: string } | null {
  const mine = Object.entries(readTokens(storage)).filter(([, entry]) => entry.docId === docId);
  const newest = mine[mine.length - 1];
  return newest ? { id: newest[0], deleteToken: newest[1].deleteToken } : null;
}

export function forgetShare(storage: Storage | null, id: string): void {
  const { [id]: _removed, ...rest } = readTokens(storage);
  writeTokens(storage, rest);
}
