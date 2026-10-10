import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { useV2WorkspaceFolder } from './useV2WorkspaceFolder';

const workspace = vi.hoisted(() => ({
  pickWorkspaceFolder: vi.fn(),
  readWorkspace: vi.fn(),
  writeWorkspace: vi.fn(async () => undefined),
  // A page's snap is whatever the test put on it.
  snapOfPage: (page: { metadata: { snap?: unknown } }) => page.metadata.snap ?? null,
}));
vi.mock('../../../services/workspace/workspaceFolder', () => workspace);

const folder = (name: string) => ({ name, writeText: vi.fn() });
const withSnap = (x: number): SceneDocumentV1 => {
  const document = createTestDocument();
  return { ...document, pages: document.pages.map((page) => ({ ...page, metadata: { snap: { viewId: 'v', positions: { a: { x, y: 0 } } } } })) };
};

beforeEach(() => { vi.clearAllMocks(); });

function setup(loaded = true) {
  let finishLoad!: () => void;
  const onLoad = vi.fn(() => new Promise<boolean>((resolve) => { finishLoad = () => resolve(loaded); }));
  const onToast = vi.fn();
  const hook = renderHook(() => useV2WorkspaceFolder({ onLoad, onToast }));
  return { hook, onLoad, onToast, finish: () => finishLoad() };
}

async function openLoaded(t: ReturnType<typeof setup>, a: ReturnType<typeof folder>) {
  workspace.pickWorkspaceFolder.mockResolvedValue(a);
  workspace.readWorkspace.mockResolvedValue({ dsl: 'architecture\n', snaps: {}, adrs: [] });
  let opening!: Promise<void>;
  act(() => { opening = t.hook.result.current.openFolder(); });
  await vi.waitFor(() => expect(t.hook.result.current.folder).toBe(a));
  return async () => { await act(async () => { t.finish(); await opening; }); };
}

describe('useV2WorkspaceFolder write-back', () => {
  it('writes only after the folder\'s own workspace has loaded, and only when the text changed', async () => {
    const a = folder('a');
    const t = setup();
    const finish = await openLoaded(t, a);
    // The page's previous model, before the folder's own has been generated: never written over the file.
    await act(() => t.hook.result.current.save('someone else\'s model', withSnap(0)));
    expect(workspace.writeWorkspace).not.toHaveBeenCalled();
    await finish();
    // The first text after the load is the folder's own, as the editor writes it: nothing to write.
    await act(() => t.hook.result.current.save('loaded model', withSnap(0)));
    await act(() => t.hook.result.current.save('loaded model', withSnap(0)));
    expect(workspace.writeWorkspace).not.toHaveBeenCalled();
    const edited = withSnap(0);
    await act(() => t.hook.result.current.save('edited model', edited));
    expect(workspace.writeWorkspace).toHaveBeenCalledWith(a, { dsl: 'edited model', document: edited });
  });

  it('a box moved on a view writes its snap, and leaves architecture.ofk as the user wrote it', async () => {
    const a = folder('a');
    const t = setup();
    await (await openLoaded(t, a))();
    await act(() => t.hook.result.current.save('loaded model', withSnap(0)));
    const moved = withSnap(40);
    await act(() => t.hook.result.current.save('loaded model', moved));
    expect(workspace.writeWorkspace).toHaveBeenCalledWith(a, { dsl: null, document: moved });
  });

  it('a folder whose workspace did not draw is never written to, and says so', async () => {
    const t = setup(false);
    await (await openLoaded(t, folder('a')))();
    await act(() => t.hook.result.current.save('the open document\'s model', withSnap(0)));
    await act(() => t.hook.result.current.save('edited', withSnap(5)));
    expect(workspace.writeWorkspace).not.toHaveBeenCalled();
    expect(t.onToast).toHaveBeenCalledWith(expect.stringContaining('architecture.ofk'), 'danger');
  });
});
