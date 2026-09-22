import type { Bounds2d, Matrix2d } from '../geometry/types';

/**
 * Camera framing: the world-space box a step looks at, mapped into the SVG
 * viewBox. Uniform fit, centred, so a glide never stretches the diagram.
 */
export function cameraFitMatrix(camera: Bounds2d, viewBox: Bounds2d): Matrix2d {
  const width = camera.width > 0 ? camera.width : viewBox.width;
  const height = camera.height > 0 ? camera.height : viewBox.height;
  const scale = Math.min(viewBox.width / width, viewBox.height / height);
  const tx = viewBox.x + (viewBox.width - width * scale) / 2;
  const ty = viewBox.y + (viewBox.height - height * scale) / 2;
  return { a: scale, b: 0, c: 0, d: scale, tx: tx - scale * camera.x, ty: ty - scale * camera.y };
}

export function interpolateBounds(from: Bounds2d, to: Bounds2d, progress: number): Bounds2d {
  const mix = (a: number, b: number) => a + (b - a) * progress;
  return {
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    width: mix(from.width, to.width),
    height: mix(from.height, to.height),
  };
}
