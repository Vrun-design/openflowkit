import { rendererColor } from '../../presentation/design-system/tokens';
import { Graphics } from 'pixi.js';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Size2d } from '../../domain/geometry/types';

/** Screen-space grid: bounded by viewport, thinned at low zoom, no ticker. */
export class PixiDotGrid {
  readonly graphics = new Graphics();

  draw(camera: CanvasCamera, size: Size2d, dark: boolean): void {
    const graphics = this.graphics.clear();
    let spacing = 16 * camera.zoom;
    while (spacing < 12) spacing *= 2;
    while ((size.width / spacing) * (size.height / spacing) > 12000) spacing *= 2;
    const xOffset = ((camera.x % spacing) + spacing) % spacing;
    const yOffset = ((camera.y % spacing) + spacing) % spacing;
    for (let x = xOffset; x < size.width; x += spacing) {
      for (let y = yOffset; y < size.height; y += spacing) graphics.circle(x, y, 0.8);
    }
    graphics.fill({ color: rendererColor(dark ? 'dark' : 'light', 'secondary'), alpha: dark ? 0.26 : 0.2 });
  }
}
