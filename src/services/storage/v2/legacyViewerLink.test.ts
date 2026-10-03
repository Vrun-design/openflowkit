import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeLegacyViewerParam } from './legacyViewerLink';

const DSL = 'flow: "Checkout"\n[start] Cart\n[end] Paid ✓\nCart -> Paid';

describe('decodeLegacyViewerParam', () => {
  it('reads v1 viewer links: pako zlib behind `~`, and the older plain base64', async () => {
    // pako.deflate (what v1 called) writes zlib, the same bytes as node's deflateSync.
    const pako = `~${deflateSync(Buffer.from(DSL), { level: 9 }).toString('base64url')}`;
    expect(await decodeLegacyViewerParam(pako)).toBe(DSL);
    expect(await decodeLegacyViewerParam(btoa(encodeURIComponent(DSL)))).toBe(DSL);
    const plus = btoa('>>>');
    expect(plus).toContain('+');
    expect(await decodeLegacyViewerParam(new URLSearchParams(`flow=${plus}`).get('flow')!)).toBe('>>>');
  });

  it('rejects a mangled link instead of returning garbage', async () => {
    await expect(decodeLegacyViewerParam('~not-zlib')).rejects.toThrow();
  });
});
