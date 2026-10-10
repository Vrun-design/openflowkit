// Frame schedule: shared by the dialog (progress and duration maths) and the
// worker (what time each frame shows). Pure, so both sides agree exactly.

export const MOTION_SIZES = [720, 1080, 1440] as const;
export const MOTION_FPS = [12, 24, 30] as const;
export type MotionSize = (typeof MOTION_SIZES)[number];
export type MotionFps = (typeof MOTION_FPS)[number];
export type MotionFormat = 'gif' | 'mp4' | 'webm';

/** ≈ 0.1 bits per pixel per frame — the spec's own size model. */
export function motionBitrate(width: number, height: number, fps: number): number {
  return Math.round(0.1 * width * height * fps);
}

/** Export size for a viewBox at the picked width, even-sided. */
export function motionCanvasSize(
  viewBox: { readonly width: number; readonly height: number }, size: MotionSize,
): { readonly width: number; readonly height: number } {
  return {
    width: Math.round(size / 2) * 2,
    height: Math.max(2, Math.round((viewBox.height / viewBox.width) * size / 2) * 2),
  };
}

/** GIF stays at or under 20 fps; video follows the picker. */
export function motionFrameIntervalMs(format: MotionFormat, fps: number): number {
  return format === 'gif' ? Math.max(1000 / fps, 50) : 1000 / fps;
}

/** Frame times, ending exactly on the clip's last frame. */
export function motionFrameTimes(durationMs: number, intervalMs: number): readonly number[] {
  const times: number[] = [];
  for (let at = 0; at < durationMs; at += intervalMs) times.push(Math.round(at));
  times.push(Math.round(durationMs));
  return times;
}

/**
 * A file holds one pass of the clip, t = 0 → duration; looping is the container's job. A looping timeline would wrap
 * the last frame back to t = 0 (an empty build), and GIF takes its palette from that frame.
 */
export function onePass<T extends { readonly loop: boolean }>(timeline: T): T {
  return timeline.loop ? { ...timeline, loop: false } : timeline;
}

/** gifenc's repeat: 0 loops forever; -1 writes no loop block, so the GIF plays once and stays on its last frame. */
export function gifRepeat(loop: boolean): number {
  return loop ? 0 : -1;
}
