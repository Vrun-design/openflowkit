import type { CinematicThemeMode } from './cinematicExport';

export interface CinematicExportTheme {
  mode: CinematicThemeMode;
  surfaceBackground: string;
  fallbackColor: string;
}

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

const LIGHT_THEME: CinematicExportTheme = {
  mode: 'light',
  surfaceBackground:
    'radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 42%), linear-gradient(180deg, #f8fbff 0%, #eef5ff 52%, #f8fafc 100%)',
  fallbackColor: '#f8fbff',
};

const DARK_THEME: CinematicExportTheme = {
  mode: 'dark',
  surfaceBackground:
    'radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 44%), linear-gradient(180deg, #06111f 0%, #0b1728 54%, #111c2d 100%)',
  fallbackColor: '#0b1728',
};

export const CINEMATIC_EXPORT_SURFACE_BACKGROUND = LIGHT_THEME.surfaceBackground;
export const CINEMATIC_EXPORT_FALLBACK_COLOR = LIGHT_THEME.fallbackColor;

export function resolveCinematicExportTheme(mode: CinematicThemeMode): CinematicExportTheme {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export function paintCinematicExportBackground(
  context: BackgroundPaintContext,
  width: number,
  height: number,
  mode: CinematicThemeMode,
): void {
  const linearGradient = context.createLinearGradient(0, 0, 0, height);
  const radialGradient = context.createRadialGradient(
    width * 0.5,
    0,
    Math.max(1, width * 0.04),
    width * 0.5,
    0,
    Math.max(width, height) * 0.42,
  );

  if (mode === 'dark') {
    linearGradient.addColorStop(0, '#06111f');
    linearGradient.addColorStop(0.54, '#0b1728');
    linearGradient.addColorStop(1, '#111c2d');
    radialGradient.addColorStop(0, 'rgba(56,189,248,0.16)');
    radialGradient.addColorStop(1, 'rgba(56,189,248,0)');
  } else {
    linearGradient.addColorStop(0, '#f8fbff');
    linearGradient.addColorStop(0.52, '#eef5ff');
    linearGradient.addColorStop(1, '#f8fafc');
    radialGradient.addColorStop(0, 'rgba(59,130,246,0.14)');
    radialGradient.addColorStop(1, 'rgba(59,130,246,0)');
  }

  context.fillStyle = linearGradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = radialGradient;
  context.fillRect(0, 0, width, height);
}
