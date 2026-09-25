import { useEffect, useRef, type RefObject } from 'react';

const TRAIL_MS = 700;

// The laser pointer: a red trail that follows the pointer and fades. Screen
// space, presentation only — nothing is written to the document.
// ponytail: local only; a shared presenter trail needs multiplayer presence.
export function V2LaserTrail(props: { readonly sectionRef: RefObject<HTMLElement | null> }): React.JSX.Element {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const section = props.sectionRef.current;
    if (!section) return;
    const points: { x: number; y: number; t: number }[] = [];
    let frame = 0;
    const paint = () => {
      const now = performance.now();
      while (points.length > 0 && now - points[0]!.t > TRAIL_MS) points.shift();
      const last = points[points.length - 1];
      pathRef.current?.setAttribute('d', points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(''));
      dotRef.current?.setAttribute('r', last ? '5' : '0');
      if (last) {
        dotRef.current?.setAttribute('cx', String(last.x));
        dotRef.current?.setAttribute('cy', String(last.y));
      }
      frame = points.length > 0 ? requestAnimationFrame(paint) : 0;
    };
    const onMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      const samples = event.getCoalescedEvents?.() ?? [event];
      for (const sample of samples.length > 0 ? samples : [event]) {
        points.push({ x: sample.clientX - rect.left, y: sample.clientY - rect.top, t: performance.now() });
      }
      if (!frame) frame = requestAnimationFrame(paint);
    };
    section.addEventListener('pointermove', onMove);
    return () => {
      section.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [props.sectionRef]);

  return (
    <svg className="ofk-v2-laser" aria-hidden="true" data-testid="v2-laser">
      <path ref={pathRef} fill="none" stroke="#ef4444" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle ref={dotRef} r="0" fill="#ef4444" />
    </svg>
  );
}
