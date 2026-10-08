import { describe, expect, it } from 'vitest';
import { relationSourceLabel, safeHttpsUrl } from './relationSource';

describe('relationSourceLabel', () => {
  it.each([
    ['https://github.com/o/r/blob/HEAD/k8s/frontend.yaml#L68', 'k8s/frontend.yaml:68'],
    ['https://github.com/o/r/blob/main/a/b.ts#L3-L9', 'a/b.ts:3-9'],
    ['https://github.com/o/r/blob/main/100%/a%zz.ts#L2', '100%/a%zz.ts:2'],
    ['https://github.com/o/r/blob/main/a%20b.ts', 'a b.ts'],
    ['https://example.com/adr/1.md#top', 'example.com/adr/1.md'],
    ['https://example.com/', 'example.com'],
    ['web/app.ts:3', 'web/app.ts:3'],
  ])('%s -> %s', (url, label) => expect(relationSourceLabel(url)).toBe(label));
});

describe('safeHttpsUrl', () => {
  it('passes only https', () => {
    expect(safeHttpsUrl('https://x.com')).toBe('https://x.com');
    for (const bad of ['javascript:alert(1)', 'http://x.com', ' https://x.com', '//x.com']) expect(safeHttpsUrl(bad)).toBeNull();
  });
});
