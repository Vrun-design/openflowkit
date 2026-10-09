import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { Icon } from './Icon';
export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: readonly TreeNode[];
  /** Trailing controls such as visibility/lock toggles. */
  trailing?: ReactNode;
  /** Agent-authored or otherwise annotated rows get a caption. */
  caption?: string;
  /** Quiet right-aligned detail, always visible (unlike `trailing`). */
  meta?: string;
  /** De-emphasised: still a row, but not what the host is looking at right now. */
  muted?: boolean;
}
export interface TreeProps {
  label: string;
  nodes: readonly TreeNode[];
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  /** Click, Enter or Space. Arrow keys only move focus. */
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  /** Double-click. Host implements reorder/reparent/drill; Tree only reports intent. */
  onActivate?: (id: string) => void;
}
function visibleIds(list: readonly TreeNode[], expandedIds: ReadonlySet<string>, out: string[] = []): string[] {
  for (const node of list) {
    out.push(node.id);
    if (node.children?.length && expandedIds.has(node.id)) visibleIds(node.children, expandedIds, out);
  }
  return out;
}
/** Layers/pages tree: single Tab stop, arrows move focus, Right/Left expand/collapse, Enter/Space/click select. */
export function Tree({
  label,
  nodes,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  onActivate,
}: TreeProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const visible = visibleIds(nodes, expandedIds);
  // Roving tab stop: where focus last was, else the selection, else the first row.
  const tabStop = [focusId, selectedId].find((id) => id !== null && visible.includes(id)) ?? visible[0];
  function rows() {
    return Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
  }
  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const list = rows();
    const current = e.target as HTMLElement;
    const i = list.indexOf(current);
    if (i < 0) return;
    const id = current.dataset.id!;
    const expandable = current.getAttribute('aria-expanded') !== null;
    const expanded = current.getAttribute('aria-expanded') === 'true';
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = list[i + 1];
    else if (e.key === 'ArrowUp') next = list[i - 1];
    else if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list[list.length - 1];
    else if (e.key === 'ArrowRight') {
      if (expandable && !expanded) onToggle(id);
      else if (expandable) next = list[i + 1];
    } else if (e.key === 'ArrowLeft') {
      if (expandable && expanded) onToggle(id);
      else next = list.slice(0, i).reverse().find((row) => Number(row.getAttribute('aria-level')) < Number(current.getAttribute('aria-level')));
    } else if (e.key === 'Enter' || e.key === ' ') onSelect(id);
    else return;
    e.preventDefault();
    next?.focus();
  }
  function render(list: readonly TreeNode[], level: number): ReactNode {
    return list.map((node) => {
      const expandable = Boolean(node.children?.length);
      const expanded = expandedIds.has(node.id);
      const selected = node.id === selectedId;
      return (
        <li key={node.id} role="none">
          <div
            role="treeitem"
            data-id={node.id}
            aria-level={level}
            aria-selected={selected}
            aria-expanded={expandable ? expanded : undefined}
            tabIndex={node.id === tabStop ? 0 : -1}
            data-muted={node.muted || undefined}
            onFocus={() => setFocusId(node.id)}
            className="ofk-tree-row"
            style={{ '--ofk-tree-level': level } as React.CSSProperties}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => onActivate?.(node.id)}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="ofk-tree-toggle"
              data-expandable={expandable || undefined}
              data-expanded={expanded || undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (expandable) onToggle(node.id);
              }}
            >
              {expandable && <Icon icon={IconChevronRight} />}
            </button>
            {node.icon && (
              <span className="ofk-tree-icon" aria-hidden="true">
                {node.icon}
              </span>
            )}
            <span className="ofk-tree-label" title={node.label}>
              {node.label}
              {node.caption && <span className="ofk-caption"> · {node.caption}</span>}
            </span>
            {node.meta && <span className="ofk-tree-meta">{node.meta}</span>}
            {node.trailing && <span className="ofk-tree-trailing">{node.trailing}</span>}
          </div>
          {expandable && expanded && <ul role="group">{render(node.children!, level + 1)}</ul>}
        </li>
      );
    });
  }
  return (
    <ul ref={ref} role="tree" aria-label={label} className="ofk-tree" onKeyDown={onKeyDown}>
      {render(nodes, 1)}
    </ul>
  );
}
