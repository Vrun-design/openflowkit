// The "open in the app" link: the DSL rides in the URL fragment, so no server ever sees it.
// Format (the app's decoder reads exactly this): base64url, no padding, of raw-deflate(utf8 DSL).
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const OPEN_LINK_MAX_PAYLOAD = 32 * 1024;
export const DEFAULT_APP_ORIGIN = 'https://app.openflowkit.com';

export function encodeDslPayload(dsl: string): string {
  return deflateRawSync(Buffer.from(dsl, 'utf8')).toString('base64url');
}

export function decodeDslPayload(payload: string): string {
  return inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8');
}

/** The link, or null when the payload is over the cap (long URLs get truncated by hosts and browsers). */
export function openUrl(dsl: string, origin = DEFAULT_APP_ORIGIN): string | null {
  const payload = encodeDslPayload(dsl);
  return payload.length > OPEN_LINK_MAX_PAYLOAD ? null : `${origin.replace(/\/+$/, '')}/#/from/dsl?d=${payload}`;
}
