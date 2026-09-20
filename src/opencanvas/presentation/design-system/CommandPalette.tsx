import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  shortcut?: string | readonly string[];
  keywords?: readonly string[];
  disabled?: boolean;
  run: () => void;
}
export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: readonly Command[];
  /** Recently used ids shown first when the query is empty. */
  recentIds?: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
  label?: string;
}
function rank(command: Command, query: string): number {
  const q = query.toLowerCase();
  const label = command.label.toLowerCase();
  if (!q) return 1;
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (
    command.keywords?.some((k) => k.toLowerCase().includes(q)) ||
    command.group.toLowerCase().includes(q)
  )
    return 1;
  return 0;
}
/** Search actions, objects, pages and agent operations. Complements visible controls; never the only path. */
export function CommandPalette({
  open,
  onClose,
  commands,
  recentIds = [],
  placeholder = 'Search actions, objects, pages…',
  emptyLabel = 'No matches',
  label = 'Commands',
}: CommandPaletteProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && el.open) el.close();
  }, [open]);
  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, score: rank(c, query) + (!query && recentIds.includes(c.id) ? 10 : 0) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    const groups = new Map<string, Command[]>();
    for (const { c, score } of scored) {
      const group = !query && score >= 10 ? 'Recent' : c.group;
      groups.set(group, [...(groups.get(group) ?? []), c]);
    }
    return [...groups.entries()];
  }, [commands, query, recentIds]);
  const flat = results.flatMap(([, list]) => list);
  const current = flat[Math.min(active, Math.max(flat.length - 1, 0))];
  function close() {
    setQuery('');
    setActive(0);
    onClose();
  }
  function run(command: Command | undefined) {
    if (!command || command.disabled) return;
    close();
    command.run();
  }
  return (
    <dialog
      ref={dialog}
      className="ofk-command ofk-overlay"
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === dialog.current && close()}
    >
      <div className="ofk-command-input">
        <Icon icon={IconSearch} />
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={current ? `${id}-${current.id}` : undefined}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, flat.length - 1));
            else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
            else if (e.key === 'Home') setActive(0);
            else if (e.key === 'End') setActive(Math.max(flat.length - 1, 0));
            else if (e.key === 'Enter') run(current);
            else return;
            e.preventDefault();
          }}
        />
      </div>
      <div id={`${id}-list`} role="listbox" className="ofk-command-list" aria-label={label}>
        {flat.length === 0 && <div className="ofk-command-empty ofk-caption">{emptyLabel}</div>}
        {results.map(([group, list]) => (
          <div key={group} role="group" aria-label={group}>
            <div className="ofk-menu-group-label" aria-hidden="true">
              {group}
            </div>
            {list.map((c) => (
              <div
                key={c.id}
                id={`${id}-${c.id}`}
                role="option"
                aria-selected={c === current}
                aria-disabled={c.disabled || undefined}
                className="ofk-menu-item"
                onMouseEnter={() => setActive(flat.indexOf(c))}
                onClick={() => run(c)}
              >
                <span className="ofk-menu-item-lead" aria-hidden="true">
                  {c.icon}
                </span>
                <span className="ofk-menu-item-label">{c.label}</span>
                {c.shortcut && <Kbd keys={c.shortcut} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </dialog>
  );
}
