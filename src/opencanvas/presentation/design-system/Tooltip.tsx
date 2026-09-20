import { cloneElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Popover } from './Popover';
import { foundation } from './tokens';
/** Supplemental text only; never the sole label. Hover/focus after a delay, long-press on touch, Escape hides. */
export function Tooltip({
  content,
  children,
  shortcut,
}: {
  content: ReactNode;
  shortcut?: string;
  children: ReactElement<{ 'aria-describedby'?: string }>;
}) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function schedule(delay: number) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  }
  function hide() {
    window.clearTimeout(timer.current);
    setOpen(false);
  }
  const described = children.props['aria-describedby'];
  const trigger = open
    ? cloneElement(children, { 'aria-describedby': [described, id].filter(Boolean).join(' ') })
    : children;
  return (
    <>
      <span
        ref={anchorRef}
        className="ofk-tooltip-anchor"
        onPointerEnter={(e) =>
          e.pointerType !== 'touch' && schedule(foundation.motion.tooltipDelay)
        }
        onPointerLeave={hide}
        onPointerDown={(e) =>
          e.pointerType === 'touch' ? schedule(foundation.motion.tooltipDelay) : hide()
        }
        onPointerUp={(e) => e.pointerType === 'touch' && window.clearTimeout(timer.current)}
        onPointerCancel={hide}
        onFocus={(e) => e.target.matches(':focus-visible') && schedule(0)}
        onBlur={hide}
      >
        {trigger}
      </span>
      <Popover
        open={open}
        anchorRef={anchorRef}
        onClose={hide}
        passive
        placement="bottom-start"
        id={id}
        role="tooltip"
        className="ofk-tooltip"
      >
        {content}
        {shortcut && <kbd className="ofk-kbd">{shortcut}</kbd>}
      </Popover>
    </>
  );
}
