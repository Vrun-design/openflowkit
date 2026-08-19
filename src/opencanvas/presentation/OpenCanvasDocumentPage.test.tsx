import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../infrastructure/pixi/capabilities', () => ({
  detectWebGlCapability: () => ({
    supported: false,
    version: null,
    reason: 'Unavailable in test',
  }),
}));

import {
  OPEN_CANVAS_CANARY_FALLBACK_EVENT,
  OpenCanvasDocumentPage,
} from './OpenCanvasDocumentPage';

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

describe('OpenCanvas document canary', () => {
  it('automatically restores React Flow route when WebGL is unavailable', async () => {
    const fallbackCodes: string[] = [];
    const listener = (event: Event) => {
      fallbackCodes.push((event as CustomEvent<{ code: string }>).detail.code);
    };
    window.addEventListener(OPEN_CANVAS_CANARY_FALLBACK_EVENT, listener);

    render(
      <MemoryRouter initialEntries={['/flow/document-1?panel=layers&renderer=opencanvas']}>
        <Routes>
          <Route path="/flow/:flowId" element={
            <>
              <OpenCanvasDocumentPage />
              <LocationProbe />
            </>
          } />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/flow/document-1?panel=layers'
      );
    });
    expect(fallbackCodes).toEqual(['WEBGL_UNAVAILABLE']);
    window.removeEventListener(OPEN_CANVAS_CANARY_FALLBACK_EVENT, listener);
  });
});
