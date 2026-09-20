import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { IconButton } from './Button';
import { Icon } from './Icon';
export interface PanelProps extends HTMLAttributes<HTMLElement> {
  title: string;
  onClose: () => void;
  side?: 'start' | 'end';
  /** Header tools such as a search field or menu trigger. */
  tools?: ReactNode;
  closeLabel?: string;
}
/** Non-modal, task-scoped utility panel. Camera stays put; on narrow screens it becomes a bottom sheet. */
export function Panel({
  title,
  onClose,
  side = 'end',
  tools,
  closeLabel = 'Close panel',
  className = '',
  children,
  onKeyDown,
  ...props
}: PanelProps) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const invoker = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = ref.current;
    invoker.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (panel?.contains(document.activeElement)) invoker.current?.focus?.();
    };
  }, []);
  return (
    <aside
      {...props}
      ref={ref}
      className={`ofk-panel ofk-floating ${className}`}
      data-side={side}
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === 'Escape') {
          e.stopPropagation();
          // Restore before unmount: afterwards the browser owns focus.
          invoker.current?.focus?.();
          onClose();
        }
      }}
    >
      <header className="ofk-panel-header">
        <h2 className="ofk-panel-title">{title}</h2>
        {tools}
        <IconButton
          ref={closeRef}
          variant="quiet"
          label={closeLabel}
          icon={<Icon icon={IconX} />}
          onClick={onClose}
        />
      </header>
      <div className="ofk-panel-body">{children}</div>
    </aside>
  );
}
