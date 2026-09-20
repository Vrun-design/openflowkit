import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';

describe('OpenCanvas text editor overlay', () => {
  it('focuses, selects, and commits once with Enter', () => {
    const onCommit = vi.fn();
    render(<OpenCanvasTextEditorOverlay bounds={{ x: 10, y: 20, width: 100, height: 50 }}
      value="Before" onCommit={onCommit} onCancel={vi.fn()} />);
    const editor = screen.getByRole('textbox', { name: 'Edit node label' });
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: 'After' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.blur(editor);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('After');
  });

  it('cancels without committing on Escape', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(<OpenCanvasTextEditorOverlay bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={onCommit} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
