import { useEffect, useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
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
  /** False: opening leaves focus where it is (a panel that opened beside a result, not on request). */
  autoFocus?: boolean;
  /** A dialog over the editor (aria-modal): Tab and Shift+Tab stay inside until it closes. */
  modal?: boolean;
}
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
/** Non-modal, task-scoped utility panel. Camera stays put; on narrow screens it becomes a bottom sheet. */
export function Panel({
  title,
  onClose,
  side = 'end',
  tools,
  closeLabel = 'Close panel',
  autoFocus = true,
  modal = false,
  className = '',
  children,
  onKeyDown,
  ...props
}: PanelProps) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Focus at first render: the opener when a child takes focus as it mounts (a field ready to type).
  const beforeMount = useRef(document.activeElement as HTMLElement | null);
  const invoker = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const panel = ref.current;
    const childTookFocus = panel?.contains(document.activeElement) ?? false;
    // Otherwise read it now, after the commit: a dialog that closed as the panel opened has handed focus back by then.
    invoker.current = childTookFocus ? beforeMount.current : document.activeElement as HTMLElement | null;
    // A child that took focus keeps it; otherwise focus lands on Close.
    if (!childTookFocus && autoFocus) closeRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, at open
  }, []);
  // Closing hands focus back in the layout phase: by a passive cleanup the panel has left the DOM and focus fell to <body>.
  useLayoutEffect(() => {
    const panel = ref.current;
    return () => {
      if (panel?.contains(document.activeElement)) invoker.current?.focus?.();
    };
  }, []);
  const trapTab = (e: React.KeyboardEvent<HTMLElement>) => {
    // Sorted: jsdom returns a selector list grouped by selector, not in document order.
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (index <= 0 ? items.at(-1) : null) : (index < 0 || index === items.length - 1 ? items[0] : null);
    if (!next) return;
    e.preventDefault();
    next.focus();
  };
  return (
    <aside
      {...props}
      ref={ref}
      className={`ofk-panel ofk-floating ${className}`}
      data-side={side}
      aria-label={title}
      {...(modal ? { role: 'dialog', 'aria-modal': true } : {})}
      tabIndex={-1}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (modal && e.key === 'Tab') trapTab(e);
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
      {/* A modal's body is a stop of its own: the keyboard scrolls a long sheet from there. */}
      <div className="ofk-panel-body" tabIndex={modal ? 0 : undefined}>{children}</div>
    </aside>
  );
}
