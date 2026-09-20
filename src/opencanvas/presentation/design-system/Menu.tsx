import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { IconCheck } from '@tabler/icons-react';
import { Popover, type Placement } from './Popover';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
const MenuContext = createContext<() => void>(() => {});
export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  label: string;
  placement?: Placement;
}
/** Menu: focus enters the first item, arrows wrap, Home/End, typeahead, Escape/outside close, focus returns. */
// ponytail: no submenus; nested actions go to the command surface. Add if a real menu needs one level.
export function Menu({
  open,
  anchorRef,
  onClose,
  label,
  placement,
  children,
  className = '',
  ...props
}: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  function items() {
    return Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    );
  }
  useEffect(() => {
    if (open) requestAnimationFrame(() => items()[0]?.focus());
  }, [open]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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
      onClose();
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
      <MenuContext.Provider value={onClose}>
        <div {...props} ref={ref} role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {children}
        </div>
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
