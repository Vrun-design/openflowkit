import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStyleClipboard } from './useStyleClipboard';

const setNodes = vi.fn();
const nodes = [
  {
    id: 'node-1',
    selected: true,
    data: {
      label: 'Node 1',
      color: 'blue',
      shape: 'rounded',
      fontWeight: 'bold',
    },
  },
  {
    id: 'node-2',
    selected: true,
    data: {
      label: 'Node 2',
      color: 'slate',
      shape: 'rectangle',
    },
  },
];

vi.mock('@/store/canvasHooks', () => ({
  useCanvasState: () => ({ nodes }),
  useCanvasActions: () => ({ setNodes }),
}));

const storage = new Map<string, string>();

vi.mock('@/services/storage/uiLocalStorage', () => ({
  readLocalStorageString: (key: string) => storage.get(key) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => storage.set(key, JSON.stringify(value)),
}));

describe('useStyleClipboard', () => {
  beforeEach(() => {
    storage.clear();
    setNodes.mockReset();
  });

  it('copies style data from the first selected node', () => {
    const { result } = renderHook(() => useStyleClipboard(vi.fn()));

    result.current.copyStyleSelection();

    expect(storage.get('flowmind-style-clipboard')).toContain('"color":"blue"');
    expect(storage.get('flowmind-style-clipboard')).not.toContain('"label"');
  });

  it('pastes copied style data onto all selected nodes', () => {
    const recordHistory = vi.fn();
    storage.set('flowmind-style-clipboard', JSON.stringify({ color: 'emerald', shape: 'capsule' }));
    const { result } = renderHook(() => useStyleClipboard(recordHistory));

    result.current.pasteStyleSelection();

    expect(recordHistory).toHaveBeenCalledTimes(1);
    expect(setNodes).toHaveBeenCalledTimes(1);
  });

  it('ignores clipboard payloads without style fields', () => {
    const recordHistory = vi.fn();
    storage.set('flowmind-style-clipboard', JSON.stringify({ label: 'ignore me' }));
    const { result } = renderHook(() => useStyleClipboard(recordHistory));

    result.current.pasteStyleSelection();

    expect(recordHistory).not.toHaveBeenCalled();
    expect(setNodes).not.toHaveBeenCalled();
  });
});
