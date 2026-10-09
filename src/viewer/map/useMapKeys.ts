import { useEffect, useRef } from 'react';
import type { Dir } from '../../opencanvas/application/map/navigate';

export interface MapKeyActions {
  search: () => void;
  fit: () => void;
  zoom: (factor: number) => void;
  move: (dir: Dir) => void;
  /** Enter or Space on the map itself (not on a box, which has its own handler). */
  toggle: () => void;
  escape: () => void;
}

const ARROWS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

/** Keyboard for every action. Fields, menus, toolbars and the panel keep their own keys; `/` works from anywhere that is not typing. */
export function useMapKeys(actions: MapKeyActions): void {
  const latest = useRef(actions);
  useEffect(() => { latest.current = actions; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const a = latest.current;
      const t = e.target as HTMLElement;
      const typing = !!t.closest('input,textarea,select,[contenteditable="true"]');
      if (e.key === '/' && !typing) { e.preventDefault(); a.search(); return; }
      if (typing || t.closest('[role="menu"],[role="dialog"],[role="toolbar"],.ofk-panel')) return;
      if (e.key === 'f' || e.key === 'F') a.fit();
      else if (e.key === '+' || e.key === '=') a.zoom(1.25);
      else if (e.key === '-') a.zoom(0.8);
      else if (ARROWS[e.key] && !t.closest('[data-edge]')) { e.preventDefault(); a.move(ARROWS[e.key]!); }
      else if ((e.key === 'Enter' || e.key === ' ') && !t.closest('[data-box],[data-edge]')) { e.preventDefault(); a.toggle(); }
      else if (e.key === 'Escape') a.escape();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
