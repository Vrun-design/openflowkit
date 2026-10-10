import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { V2CanvasWelcome } from './V2Workspace';

function Where(): React.JSX.Element { return <p data-testid="at">{useLocation().pathname}</p>; }

describe('V2CanvasWelcome', () => {
  it('offers a GitHub repo as one more way to start, opening its map', () => {
    render(<MemoryRouter initialEntries={['/d/x']}><Routes><Route path="*" element={<><V2CanvasWelcome onOpen={vi.fn()} /><Where /></>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Map a GitHub repo' }), { target: { value: 'github.com/acme/shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Map repo' }));
    expect(screen.getByTestId('at')).toHaveTextContent('/map/github/acme/shop');
  });
});
