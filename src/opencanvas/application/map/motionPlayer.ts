import type { SceneNode } from '../../domain/document/types';
import type { CanvasCamera } from '../../domain/camera/types';
import { ease } from './geometry';
import { frameAt, type MotionFrame } from './motionFrame';
import type { Drawn, MotionItem } from './planMotion';

// The one rAF loop of Map mode's open/close move. It owns the clock, the "where is everything drawn now" memory and
// the numbers; the renderer (a sink) only draws what it is handed. No React in here: a frame must not render the page.

export interface MotionSink {
  /** Draws one frame; `camera` is set while the move also carries the camera. */
  frame(frame: MotionFrame, camera: CanvasCamera | null): void;
  /** The move is over and the sink shows the finished scene. `settled` is false when it was cut short; `camera` is then where the move left the camera (null when it was not carrying one). */
  end(settled: boolean, camera: CanvasCamera | null): void;
}

export interface MotionJob {
  readonly items: readonly MotionItem[];
  readonly nodeOf: (id: string) => SceneNode | undefined;
  readonly widths: ReadonlyMap<string, number>;
  readonly camFrom: CanvasCamera;
  readonly camTo: CanvasCamera | null;
}

export interface MotionStats {
  running: boolean;
  frames: number;
  /** Time spent drawing a frame (not waiting for the GPU), ms. */
  workMs: { p50: number; p95: number; max: number };
  /** Time between frames, ms. */
  rafMs: { p50: number; p95: number };
  reactRendersDuringMotion: number;
}

const pct = (sorted: readonly number[], p: number): number => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]! : 0);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class MapMotionPlayer {
  /** Where every box is drawn right now (mid-move included): the start of the next move. */
  readonly cur = new Map<string, Drawn>();
  private job: (MotionJob & { t0: number; ms: number; done: () => void }) | null = null;
  private raf = 0;
  private cam: CanvasCamera | null = null;
  private work: number[] = [];
  private gaps: number[] = [];
  private lastTick = 0;
  private rendersAtStart = 0;
  private rendersNow: () => number = () => 0;
  private rendersDuring = 0;

  constructor(private readonly sink: MotionSink) {}

  get running(): boolean { return this.job !== null; }
  /** The camera as this loop last set it; null when it is not carrying one. */
  get camera(): CanvasCamera | null { return this.cam; }

  /** The reader took the camera: keep moving the boxes, stop moving it. */
  releaseCam(): void {
    if (this.job) this.job = { ...this.job, camTo: null };
    this.cam = null;
  }

  /** `countRenders` reads how many times the page has rendered; the difference over a move is reported. */
  play(job: MotionJob, ms: number, done: () => void, countRenders: () => number = () => 0): void {
    cancelAnimationFrame(this.raf);
    this.rendersNow = countRenders;
    if (!this.job) {
      this.work = [];
      this.gaps = [];
      this.rendersAtStart = countRenders();
      this.rendersDuring = 0;
    }
    this.lastTick = 0;
    // A move that does not carry the camera must not drop the camera of the one it replaces: it carries on from where it is.
    const carried = this.job?.camTo && !job.camTo && this.cam ? { camFrom: this.cam, camTo: this.job.camTo } : null;
    this.cam = null;
    this.job = { ...job, ...carried, t0: performance.now(), ms, done };
    this.step(this.job.t0, false);
    if (this.job) this.raf = requestAnimationFrame(this.tick);
  }

  /** Forget the running move without finishing it (the map is leaving, or a fresh scene replaces this one). */
  stop(): void {
    cancelAnimationFrame(this.raf);
    const was = this.job !== null;
    const camera = this.cam;
    this.job = null;
    this.cam = null;
    this.rendersDuring = 0;
    if (was) this.sink.end(false, camera);
  }

  stats(): MotionStats {
    const work = [...this.work].sort((a, b) => a - b);
    const gaps = [...this.gaps].sort((a, b) => a - b);
    return {
      running: this.job !== null, frames: this.work.length,
      workMs: { p50: pct(work, 0.5), p95: pct(work, 0.95), max: work.length ? work[work.length - 1]! : 0 },
      rafMs: { p50: pct(gaps, 0.5), p95: pct(gaps, 0.95) },
      reactRendersDuringMotion: this.job ? this.rendersNow() - this.rendersAtStart : this.rendersDuring,
    };
  }

  private readonly tick = (now: number): void => {
    if (!this.job) return;
    if (this.lastTick) this.gaps.push(now - this.lastTick);
    this.lastTick = now;
    this.step(now, true);
    if (this.job) this.raf = requestAnimationFrame(this.tick);
  };

  private step(now: number, counted: boolean): void {
    const job = this.job!;
    const t = Math.max(0, Math.min(1, (now - job.t0) / job.ms));
    const started = performance.now();
    const frame = frameAt(job.items, job.nodeOf, t, this.cur, job.widths);
    let camera: CanvasCamera | null = null;
    if (job.camTo) {
      const e = ease(t);
      camera = { x: lerp(job.camFrom.x, job.camTo.x, e), y: lerp(job.camFrom.y, job.camTo.y, e), zoom: lerp(job.camFrom.zoom, job.camTo.zoom, e) };
      this.cam = camera;
    }
    this.sink.frame(frame, camera);
    if (counted) this.work.push(performance.now() - started);
    if (t < 1) return;
    for (const item of job.items) if (item.fade === 'out') this.cur.delete(item.id);
    this.job = null;
    this.rendersDuring = this.rendersNow() - this.rendersAtStart;
    this.sink.end(true, this.cam);
    job.done();
  }
}
