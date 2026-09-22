import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { Popover } from './Popover';
import { Icon } from './Icon';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  hint?: string;
}

export interface DropdownProps {
  label: string;
  hideLabel?: boolean;
  value: string | null;
  onChange: (value: string) => void;
  options: readonly DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Keystroke burst buffer shared with Menu: same 600ms window, same prefix match. */
interface TypeaheadState {
  text: string;
  at: number;
}
function typeaheadQuery(state: TypeaheadState, key: string): string {
  const now = Date.now();
  state.text = now - state.at < 600 ? state.text + key : key;
  state.at = now;
  return state.text.toLowerCase();
}

/**
 * Canvas-chrome dropdown: a button trigger plus an anchored listbox.
 * The only select control: for forms, toolbars, context bars and inspectors where the menu must match system motion, collision
 * avoidance and typeahead. Single Tab stop; arrows move, Enter commits,
 * Escape returns focus to the trigger.
 */
export function Dropdown({
  label,
  hideLabel,
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled,
  id,
  className = '',
}: DropdownProps) {
  const generated = useId();
  const listId = id ?? generated;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLElement>());
  const typed = useRef({ text: '', at: 0 });
  const frame = useRef(0);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const selected = options.find((o) => o.value === value) ?? null;

  const enabled = options.filter((o) => !o.disabled);
  const [active, setActive] = useState<string | null>(selected?.value ?? enabled[0]?.value ?? null);

  function openList(fromKeyboard: boolean) {
    if (disabled) return;
    setActive(selected?.value ?? enabled[0]?.value ?? null);
    setWidth(triggerRef.current?.offsetWidth);
    setOpen(true);
    if (fromKeyboard) {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => listRef.current?.focus());
    }
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function close() {
    setOpen(false);
  }

  function commit(optionValue: string) {
    const option = options.find((o) => o.value === optionValue);
    if (!option || option.disabled) return;
    onChange(option.value);
    close();
  }

  function move(from: string | null, direction: 1 | -1): string | null {
    if (enabled.length === 0) return null;
    const index = enabled.findIndex((o) => o.value === from);
    const next = index < 0 ? (direction > 0 ? 0 : enabled.length - 1) : (index + direction + enabled.length) % enabled.length;
    return enabled[next].value;
  }

  function reveal(optionValue: string | null) {
    if (optionValue === null) return;
    const el = optionRefs.current.get(optionValue);
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ block: 'nearest' });
      } catch {
        /* Scroll is an affordance only; selection never depends on it. */
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = move(active, event.key === 'ArrowDown' ? 1 : -1);
      setActive(next);
      reveal(next);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(enabled[0]?.value ?? null);
      reveal(enabled[0]?.value ?? null);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(enabled[enabled.length - 1]?.value ?? null);
      reveal(enabled[enabled.length - 1]?.value ?? null);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (active !== null) commit(active);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      triggerRef.current?.focus();
      close();
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const query = typeaheadQuery(typed.current, event.key);
      const order = active ? [...enabled.slice(enabled.findIndex((o) => o.value === active) + 1), ...enabled] : enabled;
      const match = order.find((o) => o.label.toLowerCase().startsWith(query));
      if (match) {
        setActive(match.value);
        reveal(match.value);
      }
    }
  }

  return (
    <div className={`ofk-dropdown ${className}`} data-hide-label={hideLabel || undefined}>
      <span className="ofk-dropdown-label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="ofk-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label ${listId}-trigger`}
        disabled={disabled}
        onClick={() => (open ? close() : openList(false))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            if (!open) {
              event.preventDefault();
              openList(true);
            }
          }
        }}
      >
        <span id={`${listId}-trigger`} className="ofk-dropdown-value" data-placeholder={selected ? undefined : true}>
          {selected?.icon}
          {selected ? selected.label : placeholder}
        </span>
        <Icon icon={IconChevronDown} />
      </button>
      <Popover open={open} anchorRef={triggerRef as RefObject<HTMLElement | null>} onClose={close} placement="bottom-start" className="ofk-dropdown-list-wrap">
        <div
          ref={listRef}
          role="listbox"
          id={listId}
          aria-label={label}
          aria-activedescendant={active ? `${listId}-${active}` : undefined}
          tabIndex={0}
          className="ofk-dropdown-list"
          style={width ? { minWidth: width } : undefined}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setActive(selected?.value ?? null)}
        >
          {options.map((option) => (
            <div
              key={option.value}
              ref={(node) => {
                if (node) optionRefs.current.set(option.value, node);
                else optionRefs.current.delete(option.value);
              }}
              id={`${listId}-${option.value}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={option.value === active || undefined}
              className="ofk-menu-item"
              onClick={() => commit(option.value)}
              onMouseEnter={() => !option.disabled && setActive(option.value)}
            >
              <span className="ofk-menu-item-lead" aria-hidden="true">
                {option.value === value ? <Icon icon={IconCheck} /> : (option.icon ?? null)}
              </span>
              <span className="ofk-menu-item-label">{option.label}</span>
              {option.hint && <span className="ofk-caption">{option.hint}</span>}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
}
