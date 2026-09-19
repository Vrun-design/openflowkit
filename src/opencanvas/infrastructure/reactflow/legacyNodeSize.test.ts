import { describe, expect, it } from 'vitest';
import { resolveLegacyNodeSize } from './legacyNodeSize';

const LONG = 'A label that is far too long to fit inside the default node width';

describe('resolveLegacyNodeSize', () => {
  it('keeps the per-shape minimum for a short label', () => {
    expect(resolveLegacyNodeSize({ id: 'a', type: 'custom', data: { label: 'Start' } }))
      .toEqual({ width: 120, height: 60 });
  });

  it('grows an unsized node so the whole label fits on one line', () => {
    const size = resolveLegacyNodeSize({ id: 'a', type: 'custom', data: { label: LONG } });
    expect(size!.width).toBeGreaterThan(400);
    expect(size!.height).toBe(60);
  });

  it('wraps the label at a stated width and grows only the height', () => {
    const size = resolveLegacyNodeSize({ id: 'a', type: 'custom', data: { label: LONG, width: 200 } });
    expect(size!.width).toBe(200);
    expect(size!.height).toBeGreaterThan(60);
  });

  it('never overrides a fully stated size', () => {
    expect(resolveLegacyNodeSize({ id: 'a', type: 'custom', data: { label: LONG }, width: 50, height: 20 }))
      .toEqual({ width: 50, height: 20 });
  });

  it('adds the sub label below the label', () => {
    const withoutSub = resolveLegacyNodeSize({ id: 'a', type: 'custom', data: { label: LONG } })!;
    const withSub = resolveLegacyNodeSize({
      id: 'a', type: 'custom', data: { label: LONG, subLabel: 'detail' },
    })!;
    expect(withSub.height).toBeGreaterThan(withoutSub.height);
  });

  it('leaves mermaid_svg nodes at their stated fallback', () => {
    expect(resolveLegacyNodeSize({ id: 'm', type: 'mermaid_svg', data: { label: LONG } }))
      .toEqual({ width: 640, height: 480 });
  });
});
