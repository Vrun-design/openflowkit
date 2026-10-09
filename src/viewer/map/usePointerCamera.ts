import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { zoomAt, type Cam } from '../../opencanvas/application/map/geometry';
import type { Motion } from './motion';

/** Wheel zoom at the cursor, drag pan and pinch on the svg. `moved` is true after a drag, so the click that follows it is ignored. */
export function usePointerCamera(svg: RefObject<SVGSVGElement | null>, motion: Motion, takeCam: () => void) {
  const moved = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; cam: Cam; dist: number } | null>(null);

  useEffect(() => {
    const el = svg.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = el.getBoundingClientRect();
      takeCam();
      motion.setCam(zoomAt(motion.cam, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX - b.left, e.clientY - b.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svg, motion, takeCam]);

  const spread = () => { const [a, b] = [...pointers.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { x: e.clientX, y: e.clientY, cam: motion.cam, dist: spread() };
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (!p || !g) return;
    p.x = e.clientX; p.y = e.clientY;
    const b = e.currentTarget.getBoundingClientRect();
    if (pointers.current.size >= 2) {
      const [a, c] = [...pointers.current.values()];
      const d = spread();
      if (g.dist > 0 && d > 0) {
        moved.current = true;
        takeCam();
        motion.setCam(zoomAt(motion.cam, d / g.dist, (a!.x + c!.x) / 2 - b.left, (a!.y + c!.y) / 2 - b.top));
      }
      g.dist = d;
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!moved.current && Math.hypot(dx, dy) > 4) { moved.current = true; e.currentTarget.setPointerCapture(e.pointerId); }
    if (moved.current) { takeCam(); motion.setCam({ ...g.cam, x: g.cam.x + dx, y: g.cam.y + dy }); }
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const left = [...pointers.current.values()][0];
    gesture.current = left ? { x: left.x, y: left.y, cam: motion.cam, dist: 0 } : null;
  };
  return { moved, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
