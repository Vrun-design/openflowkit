import { describe, expect, it, vi } from 'vitest';
import { detectWebGlCapability } from './capabilities';

describe('detectWebGlCapability', () => {
  it('prefers WebGL 2', () => {
    const getContext = vi.fn((name: string) => (name === 'webgl2' ? {} : null));
    expect(detectWebGlCapability(() => ({ getContext }) as never)).toEqual({
      supported: true,
      version: 2,
      reason: null,
    });
  });

  it('falls back to WebGL 1', () => {
    const getContext = vi.fn((name: string) => (name === 'webgl' ? {} : null));
    expect(detectWebGlCapability(() => ({ getContext }) as never)).toEqual({
      supported: true,
      version: 1,
      reason: null,
    });
  });

  it('returns a reason when contexts are unavailable', () => {
    const getContext = vi.fn(() => null);
    expect(detectWebGlCapability(() => ({ getContext }) as never)).toEqual({
      supported: false,
      version: 0,
      reason: 'This device or browser did not provide a WebGL context.',
    });
  });
});
