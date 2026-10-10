import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2CreationToolbar } from './V2CreationToolbar';
import { DEFAULT_TOOL_CONFIG } from './v2ToolCatalog';

// jsdom has no ResizeObserver; the flyout popover places itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const toolbar = (onPlaceShape = vi.fn(), onToolChange = vi.fn()) => {
  render(<V2CreationToolbar tool="select" toolConfig={DEFAULT_TOOL_CONFIG} onToolChange={onToolChange} onPickShape={vi.fn()}
    onPlaceShape={onPlaceShape} onPickConnector={vi.fn()} onInsertIcon={vi.fn()} iconsOpen={false} onIconsOpenChange={vi.fn()}
    onPickEmoji={vi.fn()} recentEmoji={[]} librarySection="icons" onInsertImage={vi.fn()} moreOpen={false}
    onMoreOpenChange={vi.fn()} onPickMore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Shapes' }));
  return { onPlaceShape, onToolChange };
};

describe('V2CreationToolbar Shapes', () => {
  it('Enter on a cell places that shape (the keyboard has no canvas to click)', () => {
    const { onPlaceShape, onToolChange } = toolbar();
    fireEvent.click(screen.getByRole('option', { name: 'Rectangle' }), { detail: 0 });
    expect(onToolChange).toHaveBeenCalledWith('rectangle');
    expect(onPlaceShape).toHaveBeenCalledWith('rectangle');
  });

  it('a pointer click only arms the tool', () => {
    const { onPlaceShape } = toolbar();
    fireEvent.click(screen.getByRole('option', { name: 'Ellipse' }), { detail: 1 });
    expect(onPlaceShape).not.toHaveBeenCalled();
  });
});
