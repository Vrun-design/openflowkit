export const CINEMATIC_EXPORT_SURFACE_BACKGROUND =
  'radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 42%), linear-gradient(180deg, #f8fbff 0%, #eef5ff 52%, #f8fafc 100%)';

export const CINEMATIC_EXPORT_FALLBACK_COLOR = '#f8fbff';

export interface BackgroundPaintContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => CanvasGradient;
  createRadialGradient: (
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ) => CanvasGradient;
}

export function paintCinematicExportBackground(
  context: BackgroundPaintContext,
  width: number,
  height: number,
): void {
  const linearGradient = context.createLinearGradient(0, 0, 0, height);
  linearGradient.addColorStop(0, '#f8fbff');
  linearGradient.addColorStop(0.52, '#eef5ff');
  linearGradient.addColorStop(1, '#f8fafc');
  context.fillStyle = linearGradient;
  context.fillRect(0, 0, width, height);

  const radialGradient = context.createRadialGradient(
    width * 0.5,
    0,
    Math.max(1, width * 0.04),
    width * 0.5,
    0,
    Math.max(width, height) * 0.42,
  );
  radialGradient.addColorStop(0, 'rgba(59,130,246,0.14)');
  radialGradient.addColorStop(1, 'rgba(59,130,246,0)');
  context.fillStyle = radialGradient;
  context.fillRect(0, 0, width, height);
}
