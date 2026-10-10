import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { buildMap } from '../../dsl/map/build';
import { MapToolbar, type MapToolbarProps } from './MapToolbar';

const model = buildMap({ files: [{ path: 'a/x.ts', loc: 1 }], imports: [] });
const props = (over: Partial<MapToolbarProps> = {}): MapToolbarProps => ({
  model, depth: 'detailed', onDepth: () => undefined, onLevel: () => undefined, onCollapse: () => undefined, counts: { import: 2, call: 1 },
  layers: new Set(), onLayer: () => undefined, onReveal: () => undefined, searchRef: createRef(), onFit: () => undefined, panelOpen: false, onPanel: () => undefined, ...over,
});

describe('MapToolbar (the CLI viewer)', () => {
  it('uses the editor\'s words: the depth dial\'s levels and Connections', () => {
    render(<MapToolbar {...props()} />);
    expect(screen.getByRole('button', { name: 'Depth: One level in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connections' })).toBeTruthy();
    expect(screen.queryByText(/Layers|Detailed|Overview|Everything/)).toBeNull();
  });
});
