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
  isV1Backup: () => false,
}));

window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
// jsdom has no layout observer; the card menu's popover only needs it to exist.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
// jsdom has no modal dialogs; the platform behaviour is covered by the headed spec.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
// jsdom's File has no text().
Blob.prototype.text ??= function text(this: Blob) {
  return new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(this); });
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.open = false; };

beforeEach(async () => {
  localStorage.clear();
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
        <Route path="/" element={<V2HomePage />} />
        <Route path="/d/:id" element={<p>editor</p>} />
      </Routes>
    </MemoryRouter>
  );
}

/** Rename and delete live in each card's overflow menu. */
async function openMenu(name: string, item: string) {
  fireEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(`^${item}`) }));
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

  it('renames, archives with an undo, then deletes for good only after a confirm', async () => {
    renderHome();
    await openMenu('Made here', 'Rename');
    const input = screen.getByRole('textbox', { name: 'Rename Made here' });
    fireEvent.change(input, { target: { value: 'Renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    await screen.findByText('Renamed');
    const reloaded = await createV2Repository(indexedDB).loadDocument('doc-b');
    expect(reloaded.status === 'ok' && [reloaded.record.revision, reloaded.record.document.name]).toEqual([2, 'Renamed']);

    await openMenu('Renamed', 'Archive');
    await waitFor(() => expect(screen.queryByText('Renamed')).toBeNull());
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await screen.findByText('Renamed');

    await openMenu('Renamed', 'Archive');
    await waitFor(() => expect(screen.queryByText('Renamed')).toBeNull());
    expect(await createV2Repository(indexedDB).loadDocument('doc-b')).not.toEqual({ status: 'missing' });
    fireEvent.click(screen.getByRole('link', { name: /^Archive/ }));
    expect((await screen.findByText('Renamed')).closest('li')!.textContent).toContain('Archived just now');
    await openMenu('Renamed', 'Delete forever…');
    expect(screen.getByText(/removed from this browser/).textContent).toMatch(/^It’s removed/);
    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }));
    await screen.findByText('Nothing archived.');
    expect(await createV2Repository(indexedDB).loadDocument('doc-b')).toEqual({ status: 'missing' });
  });

  it('selects with ⌘-click and the checkbox, then archives the selection from the bar', async () => {
    renderHome();
    fireEvent.click(await screen.findByRole('link', { name: 'Made here' }), { metaKey: true });
    expect(screen.queryByText('editor')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select From the old app' }));
    const bar = screen.getByRole('toolbar', { name: 'Selection' });
    expect(bar.textContent).toContain('2 selected');
    // With a selection, a plain click selects instead of opening.
    fireEvent.click(screen.getByRole('link', { name: 'Made here' }));
    expect(bar.textContent).toContain('1 selected');
    fireEvent.click(within(bar).getByRole('button', { name: /Archive/ }));
    await waitFor(() => expect(screen.queryByRole('toolbar', { name: 'Selection' })).toBeNull());
    expect((await createV2Repository(indexedDB).listArchive()).map(({ id }) => id)).toEqual(['v1-doc-a']);
  });

  it('walks cards with arrows, stars with S and archives with Delete', async () => {
    renderHome();
    const list = await screen.findByRole('list', { name: 'Diagrams' });
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(2));
    const [first, second] = within(list).getAllByRole('link');
    first!.focus();
    fireEvent.keyDown(first!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(first);
    const name = second!.textContent!;
    fireEvent.keyDown(second!, { key: 's' });
    expect(screen.getByRole('button', { name: `Star ${name}` }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(second!, { key: 'Delete' });
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(1));
    expect((await createV2Repository(indexedDB).listArchive()).map((summary) => summary.name)).toEqual([name]);
  });

  it('an import says why a file would not open, and what it had to leave out of one that did', async () => {
    const { container } = renderHome();
    await screen.findByRole('list', { name: 'Diagrams' });
    const v1 = { nodes: [{ id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } }], edges: [{ id: 'e', source: 'a', target: 'gone' }] };
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [
      new File(['{not json'], 'bad.json', { type: 'application/json' }),
      new File([JSON.stringify(v1)], 'old.json', { type: 'application/json' }),
    ] } });
    const toast = await screen.findByText('Imported 1 diagram.');
    const text = toast.closest('[role="status"], [role="alert"], li, div')!.parentElement!.textContent;
    expect(text).toContain('bad.json: It isn’t valid JSON');
    expect(text).toContain('was left out');
  });

  it('opens a diagram', async () => {
    renderHome();
    fireEvent.click(await screen.findByText('Made here'));
    await screen.findByText('editor');
  });
  it('stars a diagram into the Starred view and the sidebar, and duplicates one', async () => {
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Star Made here' }));
    expect(screen.getByRole('button', { name: 'Star Made here' }).getAttribute('aria-pressed')).toBe('true');
    const starred = screen.getByRole('region', { name: 'Starred' });
    expect(within(starred).getByRole('link', { name: 'Made here' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: /^Starred/ }));
    const list = await screen.findByRole('list', { name: 'Diagrams' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(JSON.parse(localStorage.getItem('openflowkit-v2-home')!).starred).toEqual(['doc-b']);

    await openMenu('Made here', 'Duplicate');
    fireEvent.click(screen.getByRole('link', { name: /^Recents/ }));
    await screen.findByText('Made here copy');
    const names = (await createV2Repository(indexedDB).listDocuments()).map(({ name }) => name);
    expect(names.sort()).toEqual(['From the old app', 'Made here', 'Made here copy']);
  });

  it('Escape cancels a rename even when the input then blurs', async () => {
    renderHome();
    await openMenu('Made here', 'Rename');
    const input = screen.getByRole('textbox', { name: 'Rename Made here' });
    fireEvent.change(input, { target: { value: 'Nope' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    await screen.findByText('Made here');
    const stored = await createV2Repository(indexedDB).loadDocument('doc-b');
    expect(stored.status === 'ok' && stored.record.document.name).toBe('Made here');
  });
});
