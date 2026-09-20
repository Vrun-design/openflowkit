/** Pure spring physics for direct-manipulation release, snap and rubber-band. No scheduling here. */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
}
export const springs = {
  /** Object released after drag settles onto its final position. */
  release: { stiffness: 380, damping: 34 },
  /** Snap to grid/guide: stiffer, near-critical, no visible overshoot. */
  snap: { stiffness: 560, damping: 44 },
  /** Camera returning from an over-pan or over-zoom. */
  rubberBand: { stiffness: 220, damping: 30 },
} as const satisfies Record<string, SpringConfig>;
export interface SpringSample {
  value: number;
  velocity: number;
  done: boolean;
}
/** Closed-form damped spring from `from` to `to`; `at(ms)` is safe to call at any time and out of order. */
export function spring(
  from: number,
  to: number,
  { stiffness, damping, mass = 1, restDelta = 0.01, restSpeed = 0.01 }: SpringConfig,
  initialVelocity = 0
): { at(ms: number): SpringSample } {
  if (![from, to, stiffness, damping, mass].every(Number.isFinite) || stiffness <= 0 || mass <= 0)
    throw new RangeError('spring requires finite inputs, positive stiffness and mass.');
  const x0 = from - to;
  const v0 = initialVelocity;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  return {
    at(ms) {
      const t = Math.max(0, ms) / 1000;
      let x: number, v: number;
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        const decay = Math.exp(-zeta * w0 * t);
        const c2 = (v0 + zeta * w0 * x0) / wd;
        x = decay * (x0 * Math.cos(wd * t) + c2 * Math.sin(wd * t));
        v = -zeta * w0 * x + decay * (-x0 * wd * Math.sin(wd * t) + c2 * wd * Math.cos(wd * t));
      } else if (zeta === 1) {
        const decay = Math.exp(-w0 * t);
        const c2 = v0 + w0 * x0;
        x = decay * (x0 + c2 * t);
        v = decay * (c2 - w0 * (x0 + c2 * t));
      } else {
        const wd = w0 * Math.sqrt(zeta * zeta - 1);
        const r1 = -zeta * w0 + wd;
        const r2 = -zeta * w0 - wd;
        const c2 = (v0 - r1 * x0) / (r2 - r1);
        const c1 = x0 - c2;
        x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
        v = c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
      }
      const done = Math.abs(x) < restDelta && Math.abs(v) < restSpeed;
      return { value: done ? to : to + x, velocity: done ? 0 : v, done };
    },
  };
}
/** iOS-style resistance past a bound: returns the displayed offset for a raw overscroll. */
export function rubberBand(overscroll: number, dimension: number, coefficient = 0.55): number {
  if (!Number.isFinite(overscroll) || !Number.isFinite(dimension) || dimension <= 0) return 0;
  const sign = Math.sign(overscroll);
  const d = Math.abs(overscroll);
  return sign * (1 - 1 / ((d * coefficient) / dimension + 1)) * dimension;
}
