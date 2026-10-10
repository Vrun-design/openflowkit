import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDocument } from '@/opencanvas/testing/builders/documentBuilder';
import { FLOW_PERSISTENCE_DB_NAME } from '@/services/storage/indexedDbSchema';
import { createV2Repository } from '@/services/storage/v2/v2Repository';
import { fromGithubDocumentId, V2FromGithubPage } from './V2FromGithubPage';

window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;

function Editor(): React.JSX.Element {
  const state = useLocation().state as { source?: string } | null;
  return <p data-testid="editor">{`${useParams().id} ${state?.source ? 'with source' : 'as stored'}`}</p>;
}
const page = () => render(
  <MemoryRouter initialEntries={['/from/github/acme/shop']}>
    <Routes>
      <Route path="/from/github/*" element={<V2FromGithubPage />} />
      <Route path="/d/:id" element={<Editor />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(async () => {
  await new Promise<void>((resolve) => { indexedDB.deleteDatabase(FLOW_PERSISTENCE_DB_NAME).onsuccess = () => resolve(); });
  vi.unstubAllGlobals();
});

describe('V2FromGithubPage', () => {
  it('one document per repo: a second visit opens the stored diagram instead of reading the repo into a new one', async () => {
    const id = fromGithubDocumentId({ owner: 'acme', repo: 'shop', ref: 'HEAD' });
    expect(id).toBe('gh-acme_shop');
    await createV2Repository(indexedDB).saveDocument(id, { ...createTestDocument(), name: 'acme/shop' }, 1);
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 500 }));
    vi.stubGlobal('fetch', fetchSpy);
    page();
    await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('gh-acme_shop as stored'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('an archived diagram of the repo is brought back to Recents and opened, edits kept', async () => {
    const id = fromGithubDocumentId({ owner: 'acme', repo: 'shop', ref: 'HEAD' });
    const repository = createV2Repository(indexedDB);
    await repository.saveDocument(id, { ...createTestDocument(), name: 'acme/shop' }, 1);
    await repository.archiveDocuments([id]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    page();
    await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('gh-acme_shop as stored'));
    expect((await repository.listDocuments()).map((d) => d.id)).toContain(id);
  });

  it('a first visit reads the repo and opens it under that stable id', async () => {
    const tree = { sha: 't', tree: [{ path: 'Dockerfile', type: 'blob', size: 14 }] };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/commits/')) return new Response('e'.repeat(40));
      return url.includes('/git/trees/') ? new Response(JSON.stringify(tree)) : new Response('FROM node:20\n');
    }));
    page();
    await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('gh-acme_shop with source'));
  });
});
