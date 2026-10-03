import { Resolver } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { pixiAssetUrl } from './PixiMediaLayer';

// CNCF icons (and any uploaded SVG) colour their paths through `<style>` rules.
const SVG = "data:image/svg+xml,%3csvg%3e%3cstyle%3e.a{fill:%23cbdd72;}.b{fill:%23fff;}%3c/style%3e%3c/svg%3e";

function resolvedBy(url: string): string {
  const resolver = new Resolver();
  resolver.add({ alias: 'icon', src: url });
  return decodeURIComponent(resolver.resolve('icon').src);
}

describe('Pixi media layer', () => {
  it('keeps the CSS braces of a data-URL SVG through the Pixi asset resolver', () => {
    expect(resolvedBy(pixiAssetUrl(SVG))).toBe(decodeURIComponent(SVG));
  });

  it('leaves file URLs alone', () => {
    expect(pixiAssetUrl('/assets/icon.svg')).toBe('/assets/icon.svg');
  });
});
