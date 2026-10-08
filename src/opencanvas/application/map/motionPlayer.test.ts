import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { SceneNode } from '../../domain/document/types';
import { MapMotionPlayer, type MotionJob, type MotionSink } from './motionPlayer';
import type { MotionFrame } from './motionFrame';

const node = (id: string): SceneNode => ({
  id, kind: 'process', parentId: null, layerId: createDefaultSceneLayer().id, zIndex: 1,
  transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 10, height: 10 },
  content: {}, appearance: {}, ports: [], metadata: {}, extensions: {},
});
const r = (x: number) => ({ x, y: 0, width: 10, height: 10 });
const job = (camTo: MotionJob['camTo'] = null): MotionJob => ({
  items: [{ id: 'a', from: r(0), to: r(100), fade: null, a0: 1 }, { id: 'b', from: r(0), to: r(0), fade: 'out', a0: 1 }],
  nodeOf: (id) => node(id), widths: new Map(), camFrom: { x: 0, y: 0, zoom: 1 }, camTo,
});

describe('MapMotionPlayer', () => {
  let now = 0;
  let queue: ((t: number) => void)[] = [];
  const advance = (ms: number) => { now += ms; const run = queue; queue = []; run.forEach((f) => f(now)); };
  const frames: MotionFrame[] = [];
  const cams: unknown[] = [];
  let ended = 0;
  const sink: MotionSink = { frame: (f, c) => { frames.push(f); cams.push(c); }, end: () => { ended += 1; } };

  beforeEach(() => {
    now = 0; queue = []; frames.length = 0; cams.length = 0; ended = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => queue.push(f));
    vi.stubGlobal('cancelAnimationFrame', () => { queue = []; });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('draws from the start rects to the target over the time given, then ends once and forgets what faded out', () => {
    const player = new MapMotionPlayer(sink);
    const done = vi.fn();
    player.play(job({ x: 50, y: 0, zoom: 2 }), 480, done);
    expect(player.running).toBe(true);
    expect(frames[0]!.groups[0]!.nodes[0]!.transform.translation.x).toBe(0);
    advance(240);
    const mid = player.cur.get('a')!.x;
    expect(mid).toBeGreaterThan(50); // eased: front-loaded
    expect(mid).toBeLessThan(100);
    advance(240);
    expect(player.cur.get('a')).toMatchObject(r(100));
    expect(player.cur.has('b')).toBe(false);
    expect(cams.at(-1)).toEqual({ x: 50, y: 0, zoom: 2 });
    expect(ended).toBe(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(player.running).toBe(false);
    expect(player.stats()).toMatchObject({ running: false, frames: 2 });
  });

  it('keeps moving the boxes but not the camera once the reader takes it', () => {
    const player = new MapMotionPlayer(sink);
    player.play(job({ x: 50, y: 0, zoom: 2 }), 480, () => undefined);
    advance(100);
    player.releaseCam();
    advance(100);
    expect(cams.at(-1)).toBeNull();
    expect(frames.length).toBeGreaterThan(2);
  });

  it('re-targets from where the boxes are drawn and counts the renders of the whole move', () => {
    let renders = 0;
    const player = new MapMotionPlayer(sink);
    player.play(job(), 480, () => undefined, () => renders);
    advance(160);
    const drawn = player.cur.get('a')!;
    renders += 1;
    player.play({ ...job(), items: [{ id: 'a', from: drawn, to: r(0), fade: null, a0: 1 }] }, 480, () => undefined, () => renders);
    expect(player.cur.get('a')).toMatchObject(drawn);
    advance(480);
    expect(player.cur.get('a')).toMatchObject(r(0));
    expect(player.stats().reactRendersDuringMotion).toBe(1);
  });

  it('a move that does not carry the camera keeps the camera of the one it replaces, from where it is', () => {
    const player = new MapMotionPlayer(sink);
    player.play(job({ x: 100, y: 0, zoom: 2 }), 480, () => undefined);
    advance(120);
    const here = player.camera!;
    player.play(job(), 480, () => undefined);
    expect(player.camera).toEqual(here);
    advance(480);
    expect(cams.at(-1)).toEqual({ x: 100, y: 0, zoom: 2 });
  });

  it('hands the camera it left to the sink when cut short', () => {
    const ends: unknown[] = [];
    const player = new MapMotionPlayer({ ...sink, end: (settled, camera) => ends.push([settled, camera]) });
    player.play(job({ x: 100, y: 0, zoom: 2 }), 480, () => undefined);
    advance(120);
    const here = player.camera;
    player.stop();
    expect(ends).toEqual([[false, here]]);
  });
});
