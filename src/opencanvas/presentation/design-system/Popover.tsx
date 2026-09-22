import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useSystemRoot } from './SystemRoot';
import { foundation } from './tokens';
// Portaled child layers belong to their parent for outside-click and Escape.
interface OverlayBranch {
  readonly ref: RefObject<HTMLDivElement | null>;
  readonly children: Set<OverlayBranch>;
}
const OverlayContext = createContext<OverlayBranch | null>(null);
function contains(branch: OverlayBranch, target: Node | null): boolean {
  return !!target && (!!branch.ref.current?.contains(target) || [...branch.children].some((child) => contains(child, target)));
}

export type Placement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'left-start';
export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: Placement;
  /** Offset from the anchor in CSS pixels. */
  gap?: number;
  /** Tooltips do not take focus and do not dismiss on outside pointer. */
  passive?: boolean;
  /** An inline editor can consume Escape before the overlay dismisses. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
}
/** Anchored layer: flips when it would overflow, clamps to the viewport inset, grows from its anchor. */
export function Popover({
  open,
  anchorRef,
  onClose,
  placement = 'bottom-start',
  gap = foundation.space.xs,
  passive = false,
  onEscapeKeyDown,
  className = '',
  style,
  children,
  ...props
}: PopoverProps) {
  const root = useSystemRoot();
  const closeRef = useRef(onClose);
  const escapeRef = useRef(onEscapeKeyDown);
  useEffect(() => { escapeRef.current = onEscapeKeyDown; }, [onEscapeKeyDown]);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const ref = useRef<HTMLDivElement>(null);
  const parent = useContext(OverlayContext);
  const branch = useMemo<OverlayBranch>(() => ({ ref, children: new Set() }), []);
  useEffect(() => {
    if (!open || passive || !parent) return;
    parent.children.add(branch);
    return () => { parent.children.delete(branch); };
  }, [open, passive, parent, branch]);
  const [box, setBox] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = anchorRef.current?.getBoundingClientRect();
      // Entrance transforms shrink getBoundingClientRect. Use layout size so
      // collision placement stays valid after the animation settles.
      const self = ref.current ? { width: ref.current.offsetWidth, height: ref.current.offsetHeight } : null;
      if (!anchor || !self) return;
      const { edgeInset: inset, topLane: laneTop, bottomLane: laneBottom } = foundation.layout;
      const vw = window.innerWidth,
        vh = window.innerHeight;
      let side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
      const align = placement.split('-')[1] as 'start' | 'end';
      if (
        side === 'bottom' &&
        anchor.bottom + gap + self.height > vh - inset &&
        anchor.top - gap - self.height >= inset
      )
        side = 'top';
      else if (
        side === 'top' &&
        anchor.top - gap - self.height < inset &&
        anchor.bottom + gap + self.height <= vh - inset
      )
        side = 'bottom';
      else if (
        side === 'right' &&
        anchor.right + gap + self.width > vw - inset &&
        anchor.left - gap - self.width >= inset
      )
        side = 'left';
      else if (
        side === 'left' &&
        anchor.left - gap - self.width < inset &&
        anchor.right + gap + self.width <= vw - inset
      )
        side = 'right';
      let x: number, y: number;
      let growsUp = side === 'top';
      if (side === 'bottom' || side === 'top') {
        y = side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - self.height;
        x = align === 'start' ? anchor.left : anchor.right - self.width;
      } else {
        x = side === 'right' ? anchor.right + gap : anchor.left - gap - self.width;
        // Side layers live in the band between the toolbar lanes. Top-aligned
        // with the anchor; a tall layer from a low anchor grows upward instead.
        const fitsBelow = anchor.top + self.height <= vh - laneBottom;
        const fitsAbove = anchor.bottom - self.height >= laneTop;
        growsUp = !fitsBelow && fitsAbove;
        y = growsUp ? anchor.bottom - self.height : anchor.top;
      }
      const minY = side === 'left' || side === 'right' ? laneTop : inset;
      const maxY = side === 'left' || side === 'right' ? vh - laneBottom : vh - inset;
      x = Math.min(Math.max(inset, x), Math.max(inset, vw - inset - self.width));
      y = Math.min(Math.max(minY, y), Math.max(minY, maxY - self.height));
      const originY = growsUp ? 'bottom' : 'top';
      const originX =
        side === 'left' ? 'right' : align === 'end' && side !== 'right' ? 'right' : 'left';
      setBox({
        left: x,
        top: y,
        maxHeight: maxY - minY,
        '--ofk-origin': `${originY} ${originX}`,
        visibility: 'visible',
      } as CSSProperties);
    }
    place();
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, placement, gap]);
  // Focus moves in once the layer is placed and visible (a hidden element
  // cannot take focus). A `data-autofocus` control wins over the first button.
  const visible = box.visibility === 'visible';
  useEffect(() => {
    if (!open || passive || !visible || ref.current?.contains(document.activeElement)) return;
    const layer = ref.current;
    (layer?.querySelector<HTMLElement>('[data-autofocus]') ?? layer?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
    ))?.focus({ preventScroll: true });
  }, [open, passive, visible]);

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const layer = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Restore while the layer is still mounted. Unmount cleanups run after
    // the browser has already reset focus to body, so restoring there is
    // too late — every dismiss path below restores first, then closes.
    function restoreFocus(force = false) {
      if (passive) return;
      if (force || ref.current?.contains(document.activeElement)) {
        (anchor ?? previouslyFocused)?.focus();
      }
    }
    function onKey(event: KeyboardEvent) {
      // A passive layer is a tooltip: it hides on its own Escape handler and
      // must never keep the key from reaching the editor's shortcuts.
      if (passive) return;
      if (event.key === 'Escape' && branch.children.size === 0) {
        escapeRef.current?.(event);
        if (event.defaultPrevented) return;
        event.stopPropagation();
        restoreFocus(true);
        closeRef.current();
      }
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (contains(branch, target) || anchor?.contains(target)) return;
      restoreFocus();
      closeRef.current();
    }
    document.addEventListener('keydown', onKey, true);
    if (!passive) document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      // Fallback for host-driven closes (a pick inside the layer closed it):
      // focus either survived unmount or was already reset to body.
      if (!passive && (layer?.contains(document.activeElement) || document.activeElement === document.body))
        (anchor ?? previouslyFocused)?.focus();
    };
  }, [open, anchorRef, passive, branch]);
  if (!open) return null;
  const layer = (
    <div
      {...props}
      ref={ref}
      className={`ofk-popover ofk-overlay ofk-enter ${className}`}
      data-passive={passive || undefined}
      style={{ ...box, ...style }}
    >
      {children}
    </div>
  );
  const ownedLayer = <OverlayContext.Provider value={branch}>{layer}</OverlayContext.Provider>;
  return root.element ? createPortal(ownedLayer, root.element) : ownedLayer;
}
