import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
  contentClassName?: string;
}

type TooltipSide = NonNullable<TooltipProps['side']>;

const VIEWPORT_PADDING = 8;
const HIDDEN_POSITION = { top: -9999, left: -9999 };

function resolveTooltipSide(
  side: TooltipSide,
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  sideOffset: number
): TooltipSide {
  if (side === 'top' && triggerRect.top - tooltipRect.height - sideOffset < VIEWPORT_PADDING) return 'bottom';
  if (side === 'bottom' && triggerRect.bottom + tooltipRect.height + sideOffset > window.innerHeight - VIEWPORT_PADDING) return 'top';
  if (side === 'left' && triggerRect.left - tooltipRect.width - sideOffset < VIEWPORT_PADDING) return 'right';
  if (side === 'right' && triggerRect.right + tooltipRect.width + sideOffset > window.innerWidth - VIEWPORT_PADDING) return 'left';
  return side;
}

function getArrowStyle(side: TooltipSide): React.CSSProperties {
  const fill = 'var(--brand-text)';
  const transparent = 'transparent';

  switch (side) {
    case 'top':
      return { bottom: -4, left: '50%', transform: 'translateX(-50%)', borderWidth: '4px 4px 0', borderStyle: 'solid', borderColor: `${fill} ${transparent} ${transparent}` };
    case 'bottom':
      return { top: -4, left: '50%', transform: 'translateX(-50%)', borderWidth: '0 4px 4px', borderStyle: 'solid', borderColor: `${transparent} ${transparent} ${fill}` };
    case 'left':
      return { right: -4, top: '50%', transform: 'translateY(-50%)', borderWidth: '4px 0 4px 4px', borderStyle: 'solid', borderColor: `${transparent} ${transparent} ${transparent} ${fill}` };
    case 'right':
      return { left: -4, top: '50%', transform: 'translateY(-50%)', borderWidth: '4px 4px 4px 0', borderStyle: 'solid', borderColor: `${transparent} ${fill} ${transparent} ${transparent}` };
  }
}

export function Tooltip({
  children,
  text,
  side = 'top',
  sideOffset = 8,
  className = '',
  contentClassName = '',
}: TooltipProps): React.ReactElement {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();
  const rafRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [resolvedSide, setResolvedSide] = useState(side);
  const [position, setPosition] = useState<{ top: number; left: number }>(HIDDEN_POSITION);
  const [isVisible, setIsVisible] = useState(false);

  const triggerClassName = className.trim();

  const updatePosition = useCallback((): void => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const tr = trigger.getBoundingClientRect();
    const tt = tooltip.getBoundingClientRect();
    const preferred = resolveTooltipSide(side, tr, tt, sideOffset);
    setResolvedSide(preferred);

    let top = 0, left = 0;
    switch (preferred) {
      case 'bottom': top = tr.bottom + sideOffset; left = tr.left + (tr.width  - tt.width)  / 2; break;
      case 'left':   top = tr.top   + (tr.height - tt.height) / 2; left = tr.left  - tt.width  - sideOffset; break;
      case 'right':  top = tr.top   + (tr.height - tt.height) / 2; left = tr.right + sideOffset; break;
      default:       top = tr.top   - tt.height - sideOffset; left = tr.left + (tr.width  - tt.width)  / 2; break;
    }

    const maxL = window.innerWidth  - tt.width  - VIEWPORT_PADDING;
    const maxT = window.innerHeight - tt.height - VIEWPORT_PADDING;
    setPosition({
      left: Math.min(Math.max(left, VIEWPORT_PADDING), Math.max(maxL, VIEWPORT_PADDING)),
      top:  Math.min(Math.max(top, VIEWPORT_PADDING), Math.max(maxT, VIEWPORT_PADDING)),
    });
    setIsVisible(true);
  }, [side, sideOffset]);

  const openTooltip = useCallback((): void => {
    setIsVisible(false);
    setIsOpen(true);
  }, []);

  const closeTooltip = useCallback((): void => {
    setIsOpen(false);
    setIsVisible(false);
    setPosition(HIDDEN_POSITION);
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!isOpen) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      updatePosition();
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isOpen, text, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (): void => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      className={triggerClassName}
      aria-describedby={isOpen ? tooltipId : undefined}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      onFocus={openTooltip}
      onBlur={closeTooltip}
    >
      {children}
      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-[9999]"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                opacity: isVisible ? 1 : 0,
                transition: isVisible ? 'opacity 150ms ease' : 'none',
              }}
            >
              <div
                className={`relative rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-wide ${contentClassName}`.trim()}
                style={{
                  background: 'var(--brand-text)',
                  color: 'var(--brand-surface)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2), 0 1px 4px rgba(0,0,0,0.12)',
                }}
              >
                {text}
                <span
                  aria-hidden="true"
                  className="absolute h-0 w-0"
                  style={getArrowStyle(resolvedSide)}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
