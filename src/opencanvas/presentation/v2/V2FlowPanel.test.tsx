import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { V2FlowPanel } from './V2FlowPanel';
import type { FlowPlayback } from './useV2FlowPlayback';

it('takes focus when a flow starts, so ←/→, Space and Escape reach the player and not the panel that started it', () => {
  const entry = { step: { id: 's1', kind: 'intro' as const, label: 'Start' } };
  const playback = {
    flow: { id: 'f', name: 'Checkout', steps: [entry.step] }, flat: [entry], stepIndex: 0, step: entry, playing: false,
    jumpTo: vi.fn(), next: vi.fn(), prev: vi.fn(), toggle: vi.fn(),
  } as unknown as FlowPlayback;
  render(<V2FlowPanel playback={playback} model={null} onClose={vi.fn()} onCopy={vi.fn()} />);
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Flow Checkout' }));
});
