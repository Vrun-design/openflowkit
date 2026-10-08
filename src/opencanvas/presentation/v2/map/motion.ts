import { ease, FADE_MS, lerpRect, type Cam, type Rect } from '../../../application/map/geometry';
import type { MotionItem } from '../../../application/map/planMotion';

// The one rAF loop. React renders structure; this writes geometry (box transforms and sizes,
// camera, arrow opacity) straight to SVG attributes, so no frame re-renders React.

interface Handle { item: MotionItem; g: SVGGElement; box: SVGRectElement | null; right: Element[]; bottom: Element[] }
interface Job { handles: Handle[]; t0: number; ms: number; camFrom: Cam; camTo: Cam | null; fadeStart: number | null; done: () => void }

const num = (el: Element, name: string) => Number(el.getAttribute(name));

function place(h: Handle, r: Rect): void {
  h.g.setAttribute('transform', `translate(${r.x},${r.y})`);
  const w = Math.max(1, r.width);
  const hh = Math.max(1, r.height);
  h.box?.setAttribute('width', String(w));
  h.box?.setAttribute('height', String(hh));
  for (const el of h.right) el.setAttribute('x', String(w - num(el, 'data-right')));
  for (const el of h.bottom) el.setAttribute('y', String(hh - num(el, 'data-bottom')));
}

export class Motion {
  /** Where every box is drawn right now (mid-move included): the start of the next move. */
  readonly cur = new Map<string, Rect>();
  cam: Cam = { x: 0, y: 0, k: 1 };
  private job: Job | null = null;
  private raf = 0;

  constructor(private readonly svg: () => SVGSVGElement | null, private readonly camEl: () => SVGGElement | null, private readonly arrows: () => (SVGElement | null)[]) {}

  setCam(c: Cam): void {
    this.cam = c;
    this.camEl()?.setAttribute('transform', `translate(${c.x},${c.y}) scale(${c.k})`);
  }

  /** The user took the camera: stop gliding it, keep moving the boxes. */
  releaseCam(): void {
    if (this.job) this.job.camTo = null;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.job = null;
  }

  private setArrows(opacity: number): void {
    for (const el of this.arrows()) if (el) el.style.opacity = String(opacity);
  }

  /** Move `items` over `ms` (0 = jump), glide the camera, then fade the arrows in. `done` runs after the fade. */
  play(items: MotionItem[], camTo: Cam | null, ms: number, done: () => void): void {
    this.stop();
    const found = new Map<string, SVGGElement>();
    for (const el of this.svg()?.querySelectorAll<SVGGElement>('[data-box]') ?? []) found.set(el.dataset.id!, el);
    const handles: Handle[] = [];
    for (const base of items) {
      const g = found.get(base.id);
      // Start from where the box is drawn right now: a move may have advanced since the plan was made.
      const item = { ...base, from: this.cur.get(base.id) ?? base.from };
      if (g) handles.push({ item, g, box: g.querySelector('rect.box'), right: [...g.querySelectorAll('[data-right]')], bottom: [...g.querySelectorAll('[data-bottom]')] });
    }
    const job: Job = { handles, t0: performance.now(), ms, camFrom: this.cam, camTo, fadeStart: null, done };
    this.job = job;
    this.setArrows(ms > 0 ? 0 : 1);
    this.frame(job, ms > 0 ? job.t0 : job.t0 + 1);
    if (ms > 0) this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    if (this.job) this.frame(this.job, now);
    if (this.job) this.raf = requestAnimationFrame(this.tick);
  };

  private frame(job: Job, now: number): void {
    const t = job.ms ? Math.min(1, (now - job.t0) / job.ms) : 1;
    const e = ease(t);
    for (const h of job.handles) {
      const r = lerpRect(h.item.from, h.item.to, e);
      place(h, r);
      this.cur.set(h.item.id, r);
      h.g.style.opacity = h.item.fade === 'out' ? String(1 - e) : h.item.fade === 'in' ? String(Math.min(1, e * 1.6)) : '';
    }
    if (job.camTo) this.setCam({ x: job.camFrom.x + (job.camTo.x - job.camFrom.x) * e, y: job.camFrom.y + (job.camTo.y - job.camFrom.y) * e, k: job.camFrom.k + (job.camTo.k - job.camFrom.k) * e });
    if (t < 1) return;
    if (job.ms === 0) return this.finish(job);
    job.fadeStart ??= now;
    const f = Math.min(1, (now - job.fadeStart) / FADE_MS);
    this.setArrows(f);
    if (f >= 1) this.finish(job);
  }

  private finish(job: Job): void {
    for (const h of job.handles) {
      h.g.style.opacity = '';
      if (h.item.fade === 'out') this.cur.delete(h.item.id);
    }
    this.setArrows(1);
    this.job = null;
    job.done();
  }
}
