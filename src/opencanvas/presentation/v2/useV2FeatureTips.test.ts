import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { resetTipsForTest } from './v2FeatureTips';
import { useV2FeatureTips, type V2FeatureTipsOptions } from './useV2FeatureTips';

const page = createTestDocument({ nodes: ['a', 'b', 'c'].map((id) => createTestNode(id)) }).pages[0]!;
const base: V2FeatureTipsOptions = {
  page, readOnly: false, rendererReady: true, selectedCount: 0, aiConfigured: false,
  workspace: null, motionOpen: false, blocked: false, announce: () => undefined,
};

beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); resetTipsForTest(); });
afterEach(() => vi.useRealTimers());

it('a tip waiting to show is dropped when the editor turns read-only (Map mode) meanwhile, and none shows there', () => {
  const { result, rerender } = renderHook((options: V2FeatureTipsOptions) => useV2FeatureTips(options), { initialProps: base });
  act(() => { vi.advanceTimersByTime(300); });
  rerender({ ...base, readOnly: true });
  act(() => { vi.advanceTimersByTime(2000); });
  expect(result.current.tip).toBeNull();
  act(() => result.current.offer('motion'));
  expect(result.current.tip).toBeNull();
});

it('offers the code tip on an editable canvas', () => {
  const { result } = renderHook((options: V2FeatureTipsOptions) => useV2FeatureTips(options), { initialProps: base });
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current.tip).toBe('code');
});

it('shows no tip on a phone-width screen, where it would cover the toolbar', () => {
  const width = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
  try {
    const { result } = renderHook((options: V2FeatureTipsOptions) => useV2FeatureTips(options), { initialProps: base });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.tip).toBeNull();
  } finally {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  }
});
