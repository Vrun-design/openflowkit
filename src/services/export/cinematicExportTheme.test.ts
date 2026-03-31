import { describe, expect, it, vi } from 'vitest';
import {
  CINEMATIC_EXPORT_FALLBACK_COLOR,
  CINEMATIC_EXPORT_SURFACE_BACKGROUND,
  paintCinematicExportBackground,
  resolveCinematicExportTheme,
} from './cinematicExportTheme';

function createGradient() {
  return {
    addColorStop: vi.fn(),
  } as unknown as CanvasGradient;
}

describe('cinematicExportTheme', () => {
  it('exposes a stable fallback background color', () => {
    expect(CINEMATIC_EXPORT_FALLBACK_COLOR).toBe('#f8fbff');
    expect(CINEMATIC_EXPORT_SURFACE_BACKGROUND).toContain('linear-gradient');
  });

  it('paints the cinematic background with layered gradients', () => {
    const linearGradient = createGradient();
    const radialGradient = createGradient();
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => linearGradient),
      createRadialGradient: vi.fn(() => radialGradient),
    };

    paintCinematicExportBackground(context, 1200, 630, 'light');

    expect(context.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 630);
    expect(context.createRadialGradient).toHaveBeenCalled();
    expect(linearGradient.addColorStop).toHaveBeenCalledTimes(3);
    expect(radialGradient.addColorStop).toHaveBeenCalledTimes(2);
    expect(context.fillRect).toHaveBeenCalledTimes(2);
  });

  it('returns a dark export theme when requested', () => {
    const theme = resolveCinematicExportTheme('dark');

    expect(theme.mode).toBe('dark');
    expect(theme.fallbackColor).not.toBe(CINEMATIC_EXPORT_FALLBACK_COLOR);
  });
});
