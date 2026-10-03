import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTestDocument } from '@/opencanvas/testing/builders/documentBuilder';
import { FLOW_PERSISTENCE_DB_NAME } from '@/services/storage/indexedDbSchema';
import { createV2Repository } from '@/services/storage/v2/v2Repository';
import { V2HomePage } from './V2HomePage';

vi.mock('@/services/storage/v2/v1Import', () => ({
  readV1ImportMarker: () => ({ completedAt: '', docs: { broken: { name: 'Old one', importedAt: '', sourceUpdatedAt: '', status: 'failed', error: 'quota' } } }),
  runV1Import: () => Promise.resolve({ imported: [], failures: [], firstRun: false }),
}));

window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
// jsdom has no modal dialogs; the platform behaviour is covered by the headed spec.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.open = false; };

beforeEach(async () => {
  await new Promise<void>((resolve) => { indexedDB.deleteDatabase(FLOW_PERSISTENCE_DB_NAME).onsuccess = () => resolve(); });
  const repository = createV2Repository(indexedDB);
  await repository.saveDocument('v1-doc-a', { ...createTestDocument(), name: 'From the old app' }, 1);
  await repository.saveDocument('doc-b', { ...createTestDocument(), name: 'Made here' }, 1);
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<V2HomePage />} />
        <Route path="/d/:id" element={<p>editor</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('V2HomePage', () => {
  it('lists every diagram, tags v1 imports and names what failed', async () => {
    renderHome();
    const list = await screen.findByRole('list', { name: 'Diagrams' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
    expect(within(list).getByText('From the old app').closest('li')!.textContent).toContain('From v1');
    expect(within(list).getByText('Made here').closest('li')!.textContent).not.toContain('From v1');
    expect(screen.getByRole('region', { name: 'Not brought over' }).textContent).toContain('Old one: quota');
  });

  it('renames with the keyboard and deletes after a confirm', async () => {
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename Made here' }));
    const input = screen.getByRole('textbox', { name: 'Rename Made here' });
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    await screen.findByText('Renamed');
    const reloaded = await createV2Repository(indexedDB).loadDocument('doc-b');
    expect(reloaded.status === 'ok' && [reloaded.record.revision, reloaded.record.document.name]).toEqual([2, 'Renamed']);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Renamed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Renamed')).toBeNull());
    expect(await createV2Repository(indexedDB).loadDocument('doc-b')).toEqual({ status: 'missing' });
  });

  it('opens a diagram', async () => {
    renderHome();
    fireEvent.click(await screen.findByText('Made here'));
    await screen.findByText('editor');
  });
  it('Escape cancels a rename even when the input then blurs', async () => {
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Rename Made here' }));
    const input = screen.getByRole('textbox', { name: 'Rename Made here' });
    fireEvent.change(input, { target: { value: 'Nope' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    await screen.findByText('Made here');
    const stored = await createV2Repository(indexedDB).loadDocument('doc-b');
    expect(stored.status === 'ok' && stored.record.document.name).toBe('Made here');
  });
});
