import { afterEach, describe, expect, it, vi } from 'vitest';
import { withEmbeddedInter } from './raster';

const LABEL = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text font-family="Inter, ui-sans-serif">A</text></svg>';

describe('withEmbeddedInter', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('leaves an SVG without Inter alone', async () => {
    const plain = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    expect(await withEmbeddedInter(plain)).toBe(plain);
  });

  it('keeps the system face when the font cannot be fetched (no server here), and tries again next time', async () => {
    expect(await withEmbeddedInter(LABEL)).toBe(LABEL);
    vi.stubGlobal('fetch', async () => new Response(new Uint8Array([1, 2, 3])));
    const embedded = await withEmbeddedInter(LABEL);
    expect(embedded).toMatch(/^<svg [^>]*><style>@font-face\{font-family:'Inter';src:url\(data:font\/woff2;base64,AQID\) format\('woff2'\)/);
    expect(embedded.endsWith('<text font-family="Inter, ui-sans-serif">A</text></svg>')).toBe(true);
  });
});
