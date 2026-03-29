import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContextMenu, getContextMenuPosition } from './ContextMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('ContextMenu', () => {
  it('renders node actions', () => {
    render(
      <ContextMenu
        id="node-1"
        type="node"
        position={{ x: 310, y: 230 }}
        onClose={vi.fn()}
        onCopy={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onBringToFront={vi.fn()}
        onSendToBack={vi.fn()}
      />
    );

    expect(screen.getByText('common.copy')).toBeTruthy();
  });

  it('clamps the menu into the viewport near the bottom-right edge', () => {
    expect(
      getContextMenuPosition({
        position: { x: 310, y: 230 },
        menuRect: { width: 220, height: 180 },
        viewport: { width: 320, height: 240 },
      })
    ).toEqual({ x: 88, y: 48 });
  });
});
