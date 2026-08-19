export interface WebGlCapability {
  readonly supported: boolean;
  readonly version: 0 | 1 | 2;
  readonly reason: string | null;
}

type CanvasFactory = () => Pick<HTMLCanvasElement, 'getContext'>;

export function detectWebGlCapability(
  createCanvas: CanvasFactory = () => document.createElement('canvas')
): WebGlCapability {
  try {
    const canvas = createCanvas();
    if (canvas.getContext('webgl2')) {
      return { supported: true, version: 2, reason: null };
    }
    if (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) {
      return { supported: true, version: 1, reason: null };
    }
    return {
      supported: false,
      version: 0,
      reason: 'This device or browser did not provide a WebGL context.',
    };
  } catch {
    return {
      supported: false,
      version: 0,
      reason: 'WebGL capability detection was blocked by the browser.',
    };
  }
}
