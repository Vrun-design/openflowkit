import { describe, expect, it } from 'vitest';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import {
  MOTION_FPS, MOTION_SIZES, gifRepeat, motionBitrate, motionCanvasSize, motionFrameIntervalMs, motionFrameTimes, onePass,
} from './motionSchedule';
import { motionMime, webCodecsAvailable } from './motionFrames';
import { svgViewBox } from './canonicalSvg';
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
    const { width, height } = motionCanvasSize(svgViewBox(document, { pageId: 'p' }), 1080);
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

describe('GIF loop', () => {
  const NETSCAPE = 'NETSCAPE2.0';
  function encode(loop: boolean): string {
    const encoder = GIFEncoder();
    const rgba = new Uint8Array(4 * 4 * 4).fill(255);
    const palette = quantize(rgba, 2);
    for (let frame = 0; frame < 2; frame += 1) {
      encoder.writeFrame(applyPalette(rgba, palette), 4, 4, { palette, delay: 50, repeat: gifRepeat(loop) });
    }
    encoder.finish();
    return new TextDecoder('latin1').decode(encoder.bytes());
  }

  it('Loop off plays once: the file has no loop block', () => {
    expect(encode(false)).not.toContain(NETSCAPE);
  });

  it('Loop on repeats forever: one loop block, count 0', () => {
    const file = encode(true);
    expect(file.split(NETSCAPE)).toHaveLength(2);
    // Sub-block: 3, 1, then the little-endian count.
    const at = file.indexOf(NETSCAPE) + NETSCAPE.length;
    expect([...file.slice(at, at + 4)].map((c) => c.charCodeAt(0))).toEqual([3, 1, 0, 0]);
  });

  it('frames cover one pass: a looping clip still ends on its finished last frame', () => {
    const timeline = { loop: true, steps: [], preset: 'build' as const, durationMs: 1000 };
    expect(onePass(timeline)).toEqual({ ...timeline, loop: false });
    expect(timeline.loop).toBe(true);
  });
});
