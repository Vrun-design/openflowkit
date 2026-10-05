import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import App, { LEGACY_HOME_PATHS } from './App';

vi.mock('@/opencanvas/presentation/v2/V2EditorPage', () => ({
  V2EditorPage: () => <div data-testid="editor" />,
}));
vi.mock('@/opencanvas/presentation/v2/V2HomePage', () => ({
  V2HomePage: function Home() {
    return <div data-testid="home">{(useLocation().state as { notice?: string } | null)?.notice}</div>;
  },
}));

describe('App routing', () => {
  it('redirects / to a new document and opens the editor', async () => {
    window.location.hash = '#/';
    const { findByTestId } = render(<App />);
    // A first visit waits up to 2 s for the v1 import (loaded on demand) before minting a document.
    await findByTestId('editor', {}, { timeout: 4000 });
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/d\/doc-/));
  });

  it('redirects legacy /v2/:id to /d/:id', async () => {
    window.location.hash = '#/v2/abc';
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/d/abc'));
  });

  // Phase 12.5: every v1 route lands somewhere real. jsdom has no IndexedDB, so no v1 document exists.
  const v1Routes: readonly (readonly [string, string])[] = [
    ['#/home', '#/home'],
    ...LEGACY_HOME_PATHS.map((path) => [`#${path.replace(':slug', 'intro').replace(':lang', 'en')}`, '#/home'] as const),
    ['#/view', '#/home'],
    ['#/flow/doc-gone', '#/home'],
  ];
  it.each(v1Routes)('sends v1 %s to %s', async (from, to) => {
    window.location.hash = from;
    const { findByTestId } = render(<App />);
    await findByTestId('home');
    expect(window.location.hash).toBe(to);
  });

  it('tells a visitor whose old diagram link found nothing', async () => {
    window.location.hash = '#/flow/doc-gone';
    const { findByText } = render(<App />);
    await findByText("That diagram isn't in this browser.");
  });
});
