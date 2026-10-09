import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MapModel } from '../../../../dsl/map/types';
import { canOpen } from '../../../application/map/navigate';
import { pathToReveal } from '../../../application/map/mapFind';
import { BUDGET_NOTE, fitsBudget } from './mapMode';

interface Options {
  readonly available: boolean;
  readonly active: boolean;
  readonly lineageKey: string;
  readonly model: MapModel | null;
  readonly open: ReadonlySet<string>;
  readonly setOpen: (open: ReadonlySet<string>) => void;
  readonly setMode: (mode: 'canvas' | 'map') => void;
  readonly focusRef: RefObject<{ id: string | null } | null>;
  readonly pendingRef: RefObject<string | null>;
  readonly notify: (message: string) => void;
}

/**
 * Canvas gestures that mean "go into this element" (Enter, the context bar, the context menu) enter Map with it opened
 * (its ancestors too) and selected. The model is not built until Map is on, so the wish waits for it.
 */
export function useMapEntry({ available, active, lineageKey, model, open, setOpen, setMode, focusRef, pendingRef, notify }: Options) {
  const wantRef = useRef<string | null>(null);
  const [asked, setAsked] = useState(0);
  // Leaving Map or changing page drops a wish that was never served.
  useEffect(() => { if (!active) wantRef.current = null; }, [active]);
  useEffect(() => { wantRef.current = null; }, [lineageKey]);
  const enterMapAt = useCallback((id: string): boolean => {
    if (!available) return false;
    wantRef.current = id;
    setMode('map');
    setAsked((n) => n + 1);
    return true;
  }, [available, setMode]);
  useEffect(() => {
    const id = wantRef.current;
    if (!id || !active || !model?.nodes[id]) return;
    wantRef.current = null;
    const path = pathToReveal(model, id);
    const inner = canOpen(model, id) ? [id] : [];
    // What the reader had open first; over the budget, just the way down to the element (opened itself if that fits too), else only the way down.
    const next = [new Set([...open, ...path, ...inner]), new Set([...path, ...inner]), new Set(path)].find((set) => fitsBudget(model, set));
    if (!next) notify(BUDGET_NOTE);
    // First landing or a move: the camera frames the element, and it is selected once its layout arrives (if it is drawn at all).
    focusRef.current = { id };
    pendingRef.current = id;
    if (next) setOpen(next);
  }, [asked, active, model, open, setOpen, focusRef, pendingRef, notify]);
  return { enterMapAt };
}
