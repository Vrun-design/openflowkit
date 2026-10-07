import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../opencanvas/testing/builders/documentBuilder';
import { decryptDocument, encryptDocument, SHARE_ENVELOPE_VERSION, ShareCryptoError } from './shareCrypto';

const LABEL = 'Quarterly payroll secret';
const document = () => createTestDocument({ nodes: [createTestNode('a', { content: { label: LABEL } })] });

async function failure(promise: Promise<unknown>): Promise<ShareCryptoError> {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ShareCryptoError);
  return error as ShareCryptoError;
}

describe('share envelope', () => {
  it('round-trips a document through body + key', async () => {
    const { body, key } = await encryptDocument(document());
    expect(body[0]).toBe(SHARE_ENVELOPE_VERSION);
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await decryptDocument(body, key)).toEqual(document());
  });

  it('stores no plaintext: the label is absent from the body', async () => {
    const { body } = await encryptDocument(document());
    expect(new TextDecoder('latin1').decode(body)).not.toContain(LABEL);
    expect(new TextDecoder('latin1').decode(body)).not.toContain('OpenFlowKit');
  });

  it('encrypts afresh each time', async () => {
    const [one, two] = await Promise.all([encryptDocument(document()), encryptDocument(document())]);
    expect(one.key).not.toBe(two.key);
    expect(one.body).not.toEqual(two.body);
  });

  it('a wrong key fails with decrypt-failed', async () => {
    const { body } = await encryptDocument(document());
    const other = (await encryptDocument(document())).key;
    expect((await failure(decryptDocument(body, other))).code).toBe('decrypt-failed');
  });

  it('a missing, truncated or malformed key fails with bad-key', async () => {
    const { body, key } = await encryptDocument(document());
    for (const bad of ['', key.slice(0, 20), `${key}AA`, `${key.slice(0, 42)}!`]) {
      expect((await failure(decryptDocument(body, bad))).code, bad).toBe('bad-key');
    }
  });

  it('a tampered body fails, whichever byte changed', async () => {
    const { body, key } = await encryptDocument(document());
    for (const index of [1, 13, body.length - 1]) {
      const tampered = body.slice();
      tampered[index] = tampered[index]! ^ 0xff;
      expect((await failure(decryptDocument(tampered, key))).code, `byte ${index}`).toBe('decrypt-failed');
    }
  });

  it('an unknown version is named, not reported as a bad key', async () => {
    const { body, key } = await encryptDocument(document());
    const future = body.slice();
    future[0] = SHARE_ENVELOPE_VERSION + 1;
    const error = await failure(decryptDocument(future, key));
    expect(error.code).toBe('unknown-version');
    expect(error.message).toMatch(/different version/);
  });

  it('a body too short to hold an envelope is corrupt', async () => {
    const { key } = await encryptDocument(document());
    expect((await failure(decryptDocument(new Uint8Array(), key))).code).toBe('corrupt');
    expect((await failure(decryptDocument(new Uint8Array([SHARE_ENVELOPE_VERSION, 1, 2]), key))).code).toBe('corrupt');
  });
});
