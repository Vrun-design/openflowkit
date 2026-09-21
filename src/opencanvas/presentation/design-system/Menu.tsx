import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useId,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import { Popover, type Placement } from './Popover';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { useSystemRoot } from './SystemRoot';
const MenuContext = createContext<() => void>(() => {});
const SubmenuContext = createContext<{ active: string | null; setActive: (id: string | null) => void }>({ active: null, setActive: () => {} });
export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  placement?: Placement;
  focusOnOpen?: boolean;
  /** A submenu dismisses itself on Escape, but selection closes the whole tree. */
  onSelectClose?: () => void;
}
/** Menu: focus enters the first item, arrows wrap, Home/End, typeahead, Escape/outside close, focus returns. */
export function Menu({
  open,
  anchorRef,
  onClose,
  label,
  placement,
  focusOnOpen = true,
  onSelectClose,
  children,
  className = '',
  ...props
}: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const typed = useRef({ text: '', at: 0 });
  function items() {
    return Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    );
  }
  useEffect(() => {
    if (!open || !focusOnOpen) return;
    const frame = requestAnimationFrame(() => items()[0]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, focusOnOpen]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[role="menu"]') !== ref.current) return;
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (index + 1) % list.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + list.length) % list.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'Tab') {
      event.preventDefault();
      anchorRef.current?.focus();
      (onSelectClose ?? onClose)();
      return;
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      typed.current = {
        text: now - typed.current.at < 600 ? typed.current.text + event.key : event.key,
        at: now,
      };
      const query = typed.current.text.toLowerCase();
      const match = [...list.slice(index + 1), ...list.slice(0, index + 1)].find((el) =>
        el.textContent?.trim().toLowerCase().startsWith(query)
      );
      if (match) next = list.indexOf(match);
    }
    if (next === undefined) return;
    event.preventDefault();
    list[next]?.focus();
  }
  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      placement={placement}
      className={`ofk-menu ${className}`}
    >
      <MenuContext.Provider value={onSelectClose ?? onClose}>
        <SubmenuContext.Provider value={{ active, setActive }}>
        <div {...props} ref={ref} role="menu" aria-label={label} onKeyDown={onKeyDown}
          onPointerMove={(event) => {
            if ((event.target as HTMLElement).closest('[role="menu"]') !== ref.current) return;
            const item = (event.target as HTMLElement).closest<HTMLElement>('[role^="menuitem"]');
            if (item?.getAttribute('aria-disabled') !== 'true') item?.focus({ preventScroll: true });
            if (!item?.matches('[aria-haspopup="menu"]')) setActive(null);
            props.onPointerMove?.(event);
          }}>
          {children}
        </div>
        </SubmenuContext.Provider>
      </MenuContext.Provider>
    </Popover>
  );
}
export interface MenuItemProps {
  children: ReactNode;
  onSelect: () => void;
  icon?: ReactNode;
  shortcut?: string | readonly string[];
  disabled?: boolean;
  /** Renders a checkbox or radio item with the given state. */
  checked?: boolean;
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
  danger?: boolean;
  /** Menu closes after select by default; keep open for toggles. */
  keepOpen?: boolean;
}
export function MenuItem({
  children,
  onSelect,
  icon,
  shortcut,
  disabled,
  checked,
  role,
  danger,
  keepOpen,
}: MenuItemProps) {
  const close = useContext(MenuContext);
  const resolvedRole = role ?? (checked === undefined ? 'menuitem' : 'menuitemcheckbox');
  function select() {
    if (disabled) return;
    onSelect();
    if (!keepOpen) close();
  }
  return (
    <div
      role={resolvedRole}
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      aria-checked={resolvedRole === 'menuitem' ? undefined : Boolean(checked)}
      data-danger={danger || undefined}
      className="ofk-menu-item"
      onClick={select}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      }}
    >
      <span className="ofk-menu-item-lead" aria-hidden="true">
        {checked !== undefined ? checked ? <Icon icon={IconCheck} /> : null : icon}
      </span>
      <span className="ofk-menu-item-label">{children}</span>
      {shortcut && <Kbd keys={shortcut} />}
    </div>
  );
}
export function MenuSeparator() {
  return <div role="separator" className="ofk-menu-separator" />;
}
export function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="ofk-menu-group">
      <div className="ofk-menu-group-label" aria-hidden="true">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Cascading menu with hover, touch, keyboard entry and collision-aware placement. */
export function MenuSubmenu({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const rtl = useSystemRoot().element?.dir === 'rtl';
  const enterKey = rtl ? 'ArrowLeft' : 'ArrowRight';
  const exitKey = rtl ? 'ArrowRight' : 'ArrowLeft';
  const anchorRef = useRef<HTMLDivElement>(null);
  const closeTree = useContext(MenuContext);
  const { active, setActive } = useContext(SubmenuContext);
  const [keyboard, setKeyboard] = useState(false);
  const open = active === id;
  const close = () => setActive(null);
  const enter = () => {
    setKeyboard(true);
    setActive(id);
  };
  return <>
    <div ref={anchorRef} role="menuitem" tabIndex={-1} aria-haspopup="menu"
      aria-expanded={open} aria-controls={open ? id : undefined}
      className="ofk-menu-item ofk-submenu-trigger"
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return;
        setKeyboard(false); setActive(id);
      }}
      onClick={enter}
      onKeyDown={(event) => {
        if (event.key === exitKey && open) {
          event.preventDefault(); event.stopPropagation(); close();
        } else if ([enterKey, 'Enter', ' '].includes(event.key)) {
          event.preventDefault(); event.stopPropagation(); enter();
        }
      }}>
      <span className="ofk-menu-item-label">{label}</span>
      <Icon icon={IconChevronRight} />
    </div>
    {open ? <Menu open anchorRef={anchorRef} onClose={close} onSelectClose={closeTree}
      focusOnOpen={keyboard} placement={rtl ? 'left-start' : 'right-start'} label={label} id={id}
      className="ofk-cascade-menu" data-context-menu
      onKeyDownCapture={(event) => {
        if (event.key === exitKey) {
          event.preventDefault(); event.stopPropagation();
          anchorRef.current?.focus(); close();
        }
      }}>
      {children}
    </Menu> : null}
  </>;
}
