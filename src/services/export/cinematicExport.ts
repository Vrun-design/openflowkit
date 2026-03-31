export type CinematicExportFormat = 'cinematic-video';
export type CinematicExportSpeed = 'slow' | 'normal' | 'fast';
export type CinematicExportResolution = '720p' | '1080p' | '4k';
export type CinematicThemeMode = 'light' | 'dark';

export interface CinematicExportRequest {
  format: CinematicExportFormat;
  speed: CinematicExportSpeed;
  resolution: CinematicExportResolution;
  themeMode: CinematicThemeMode;
}

export interface CinematicResolutionPreset {
  maxDimension: number;
  pixelRatio: number;
  label: string;
}

export function getCinematicSpeedMultiplier(speed: CinematicExportSpeed): number {
  if (speed === 'slow') {
    return 0.72;
  }

  if (speed === 'fast') {
    return 1.7;
  }

  return 1;
}

export function getCinematicResolutionPreset(
  resolution: CinematicExportResolution
): CinematicResolutionPreset {
  if (resolution === '720p') {
    return {
      maxDimension: 1280,
      pixelRatio: 1.5,
      label: '720p',
    };
  }

  if (resolution === '4k') {
    return {
      maxDimension: 3840,
      pixelRatio: 2,
      label: '4k',
    };
  }

  return {
    maxDimension: 1920,
    pixelRatio: 2,
    label: '1080p',
  };
}

export function createDefaultCinematicExportRequest(
  themeMode: CinematicThemeMode
): CinematicExportRequest {
  return {
    format: 'cinematic-video',
    speed: 'normal',
    resolution: '1080p',
    themeMode,
  };
}
