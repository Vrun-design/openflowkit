import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { useV2MediaInsert } from './useV2MediaInsert';

it('a file that cannot be added says so where people look, not only to the screen reader', async () => {
  const announce = vi.fn();
  const onFailure = vi.fn();
  const { result } = renderHook(() => useV2MediaInsert({
    pageRef: { current: createTestDocument().pages[0]! }, commit: vi.fn(), applySelection: vi.fn(), applyConnectorSelection: vi.fn(),
    announce, onFailure, mintId: (prefix) => prefix, centreWorld: () => ({ x: 0, y: 0 }), readOnlyRef: { current: false },
  }));
  await result.current.insertImageFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));
  expect(onFailure).toHaveBeenCalledWith('That file is not an image.');
  expect(announce).toHaveBeenCalledWith('That file is not an image.');
});
