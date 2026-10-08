import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeDslPayload, MAX_DSL_BYTES } from './dslLink';

const encode = (text: string) => deflateRawSync(Buffer.from(text, 'utf8')).toString('base64url');

describe('decodeDslPayload', () => {
  it('reads what node deflateRaw + base64url wrote, unicode included', async () => {
    const dsl = 'flow "Café ☕"\n  a -> b\n';
    expect(await decodeDslPayload(encode(dsl))).toBe(dsl);
  });
  it('rejects a missing payload', async () => {
    await expect(decodeDslPayload(null)).rejects.toThrow(/missing/i);
    await expect(decodeDslPayload('')).rejects.toThrow(/missing/i);
  });
  it('rejects bad base64', async () => {
    await expect(decodeDslPayload('***not base64***')).rejects.toThrow(/base64/i);
  });
  it('rejects a bad deflate stream', async () => {
    await expect(decodeDslPayload(Buffer.from('plain text, not deflate').toString('base64url'))).rejects.toThrow(/compressed/i);
  });
  it('rejects output over the cap', async () => {
    await expect(decodeDslPayload(encode('a'.repeat(MAX_DSL_BYTES + 1)))).rejects.toThrow(/too large/i);
  });
});
