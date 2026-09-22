import { describe, expect, it } from 'vitest';
import {
  MOTION_FPS, MOTION_SIZES, motionBitrate, motionFrameIntervalMs, motionFrameTimes,
} from './motionSchedule';
import { motionCanvasSize, motionMime, webCodecsAvailable } from './motionFrames';
import { compile } from '../../../dsl/compile';
import type { SceneDocumentV1 } from '../../domain/document/types';

describe('motion schedule', () => {
  it('offers the sizes and frame rates the dialog shows', () => {
    expect(MOTION_SIZES).toEqual([720, 1080, 1440]);
    expect(MOTION_FPS).toEqual([12, 24, 30]);
  });

  it('derives the bitrate from pixels and frames', () => {
    expect(motionBitrate(1920, 1080, 30)).toBe(6220800);
    expect(motionBitrate(1280, 720, 24)).toBe(2211840);
  });

  it('caps GIF at 20 fps and follows the picker for video', () => {
    expect(motionFrameIntervalMs('gif', 30)).toBe(50);
    expect(motionFrameIntervalMs('gif', 24)).toBe(50);
    expect(motionFrameIntervalMs('gif', 12)).toBeCloseTo(83.333, 3);
    expect(motionFrameIntervalMs('mp4', 30)).toBe(1000 / 30);
    expect(motionFrameIntervalMs('webm', 12)).toBe(1000 / 12);
  });

  it('ends the frame list exactly on the clip', () => {
    const times = motionFrameTimes(1000, 100);
    expect(times).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    expect(motionFrameTimes(8500, 50).at(-1)).toBe(8500);
    // A single frame when the clip is shorter than one interval.
    expect(motionFrameTimes(20, 50)).toEqual([0, 20]);
  });

  it('sizes the canvas from the page aspect, even-sided for H.264', async () => {
    const compiled = await compile('%% ofk 1\nflowchart\na -> b\n');
    const document = {
      format: 'openflowkit.scene', schemaVersion: 1, id: 'x', name: 'x',
      createdAt: '', updatedAt: '', metadata: {}, extensions: {},
      pages: [{
        id: 'p', name: 'P', diagramKind: 'flowchart',
        layers: [{ id: 'default', name: 'L', visible: true, locked: false }],
        nodes: [compiled.frame, ...compiled.nodes], connectors: compiled.connectors,
        metadata: {}, extensions: {},
      }],
    } as SceneDocumentV1;
    const { width, height } = motionCanvasSize(document, 'p', 1080);
    expect(width).toBe(1080);
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
    expect(height).toBeGreaterThan(0);
  });

  it('maps formats to mime types', () => {
    expect(motionMime('gif')).toBe('image/gif');
    expect(motionMime('mp4')).toBe('video/mp4');
    expect(motionMime('webm')).toBe('video/webm');
  });

  it('reports WebCodecs availability without throwing where it is absent', () => {
    expect(typeof webCodecsAvailable()).toBe('boolean');
  });
});
