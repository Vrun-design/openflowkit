import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeDslPayload, encodeDslPayload, openUrl } from '../src/lib/openLink.js';

describe('openLink', () => {
  it('round-trips unicode DSL as unpadded base64url', () => {
    const dsl = 'flowchart\nA[Café ☕] -> B[日本語]\n';
    const payload = encodeDslPayload(dsl);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDslPayload(payload)).toBe(dsl);
  });

  it('builds the fragment link on the given origin', () => {
    const url = openUrl('A -> B', 'https://example.test/')!;
    expect(url.startsWith('https://example.test/#/from/dsl?d=')).toBe(true);
    expect(decodeDslPayload(url.split('?d=')[1]!)).toBe('A -> B');
  });

  it('returns null past the 32 KB payload cap', () => {
    expect(openUrl(randomBytes(40_000).toString('hex'))).toBeNull();
  });
});
