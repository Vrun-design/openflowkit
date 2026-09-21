import type { HTMLAttributes } from 'react';
export type FloatingSlot =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'start'
  | 'end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';
/** Named edge-inset slots over the canvas so features never write absolute positioning. Children receive pointer events; the region does not. */
export function FloatingRegion({
  slot,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { slot: FloatingSlot; ref?: React.Ref<HTMLDivElement> }) {
  return <div {...props} className={`ofk-floating-region ${className}`} data-slot={slot} />;
}
