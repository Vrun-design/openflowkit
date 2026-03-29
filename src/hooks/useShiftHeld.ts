import { useEffect, useState } from 'react';

/** Lightweight Shift-key watcher — mounts only while a node is selected. */
export function useShiftHeld(selected: boolean): boolean {
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    if (!selected) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [selected]);

  return selected ? shiftHeld : false;
}
