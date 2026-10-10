import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildMap } from '../../../../dsl/map/build';
import type { CanvasCamera } from '../../../domain/camera/types';
import { useMapControls } from './useMapControls';

// Two levels only: One level in and All levels open the same boxes.
const shallow = buildMap({ files: ['a/x.ts', 'a/y.ts', 'b/z.ts', 'b/w.ts', 'c/q.ts', 'd/r.ts'].map((path) => ({ path, loc: 5 })), imports: [] });

function useDial(clearSelection: () => void = () => undefined) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const ref = <T,>(current: T) => ({ current });
  return useMapControls({
    model: shallow, open, setOpen, focusRef: ref(null), shown: ref(null), hostRef: ref(null), cameraRef: ref<CanvasCamera>({ x: 0, y: 0, zoom: 1 }),
    updateCamera: () => undefined, primaryId: () => null, select: () => undefined, clearSelection, pendingRef: ref(null), notify: () => undefined,
  });
}

describe('useMapControls depth dial', () => {
  it('lights the level the reader clicked when two levels open the same boxes', () => {
    const { result } = renderHook(useDial);
    act(() => result.current.setDepth('everything'));
    expect(result.current.depth).toBe('everything');
    act(() => result.current.setDepth('detailed'));
    expect(result.current.depth).toBe('detailed');
    act(() => result.current.setDepth('overview'));
    expect(result.current.depth).toBe('overview');
  });
  it('a depth change drops an arrow selection: its dimmed map would be re-framed with the arrow out of sight', () => {
    const clear = vi.fn();
    const { result } = renderHook(() => useDial(clear));
    act(() => result.current.setDepth('everything'));
    expect(clear).toHaveBeenCalled();
  });
});
