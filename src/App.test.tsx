import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('@/opencanvas/presentation/v2/V2EditorPage', () => ({
  V2EditorPage: () => <div data-testid="editor" />,
}));

describe('App routing', () => {
  it('redirects / to a new document and opens the editor', async () => {
    window.location.hash = '#/';
    const { findByTestId } = render(<App />);
    await findByTestId('editor');
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/d\/doc-/));
  });

  it('redirects legacy /v2/:id to /d/:id', async () => {
    window.location.hash = '#/v2/abc';
    render(<App />);
    await waitFor(() => expect(window.location.hash).toBe('#/d/abc'));
  });
});
