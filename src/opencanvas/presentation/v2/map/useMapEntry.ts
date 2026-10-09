import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { MapModel } from '../../../../dsl/map/types';
import { canOpen } from '../../../application/map/navigate';
import { pathToReveal } from '../../../application/map/mapFind';
import { sameOpen } from '../../../application/map/mapNavigation';
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
 * `reveal` (the Canvas | Map switch with a selection) only opens the way down to it: opening the element itself is drill's job.
 */
export function useMapEntry({ available, active, lineageKey, model, open, setOpen, setMode, focusRef, pendingRef, notify }: Options) {
  const wantRef = useRef<{ id: string; reveal: boolean } | null>(null);
  const [asked, setAsked] = useState(0);
  // Leaving Map or changing page drops a wish that was never served.
  useEffect(() => { if (!active) wantRef.current = null; }, [active]);
  useEffect(() => { wantRef.current = null; }, [lineageKey]);
  const enterMapAt = useCallback((id: string, { reveal = false }: { reveal?: boolean } = {}): boolean => {
    if (!available) return false;
    wantRef.current = { id, reveal };
    setMode('map');
    setAsked((n) => n + 1);
    return true;
  }, [available, setMode]);
  useEffect(() => {
    const want = wantRef.current;
    if (!want || !active || !model?.nodes[want.id]) return;
    const { id, reveal } = want;
    wantRef.current = null;
    const path = pathToReveal(model, id);
    const inner = !reveal && canOpen(model, id) ? [id] : [];
    // What the reader had open first; over the budget, just the way down to the element (opened itself if that fits too), else only the way down.
    const next = [new Set([...open, ...path, ...inner]), new Set([...path, ...inner]), new Set(path)].find((set) => fitsBudget(model, set));
    if (!next) notify(BUDGET_NOTE);
    // First landing or a move: the camera frames the element, and it is selected once its layout arrives (if it is drawn at all).
    focusRef.current = { id };
    pendingRef.current = id;
    if (next && !sameOpen(next, open)) setOpen(next);
  }, [asked, active, model, open, setOpen, focusRef, pendingRef, notify]);
  return { enterMapAt };
}
