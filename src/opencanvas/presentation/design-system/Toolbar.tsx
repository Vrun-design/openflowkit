import { useEffect, useRef, type HTMLAttributes, type KeyboardEvent } from 'react';
export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  orientation?: 'horizontal' | 'vertical';
}
/** One Tab stop for tools, arrow navigation inside. Inputs retain native caret behavior. */
export function Toolbar({
  label,
  orientation = 'horizontal',
  className = '',
  onKeyDown,
  onFocusCapture,
  ...props
}: ToolbarProps) {
  const root = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement | null>(null);
  function buttons() {
    return Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
    ).filter(
      (button) =>
        button.closest('[role="toolbar"]') === root.current &&
        !button.closest('[hidden]') &&
        getComputedStyle(button).display !== 'none' &&
        getComputedStyle(button).visibility !== 'hidden'
    );
  }
  function syncTabStop(preferred = current.current) {
    const available = buttons();
    const target = preferred && available.includes(preferred) ? preferred : available[0];
    current.current = target ?? null;
    for (const button of available) button.tabIndex = button === target ? 0 : -1;
  }
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    syncTabStop();
    const observer = new MutationObserver(() => syncTabStop());
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden'],
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const available = buttons();
    const index = available.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const rtl = getComputedStyle(root.current!).direction === 'rtl';
    const next = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const previous = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let destination: number;
    if (event.key === next) destination = (index + 1) % available.length;
    else if (event.key === previous)
      destination = (index - 1 + available.length) % available.length;
    else if (event.key === 'Home') destination = 0;
    else if (event.key === 'End') destination = available.length - 1;
    else return;
    event.preventDefault();
    syncTabStop(available[destination]);
    available[destination]?.focus();
  }
  return (
    <div
      {...props}
      ref={root}
      className={`ofk-toolbar ${className}`}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      onKeyDown={navigate}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        const target = event.target;
        if (target instanceof HTMLButtonElement && buttons().includes(target)) syncTabStop(target);
      }}
    />
  );
}
