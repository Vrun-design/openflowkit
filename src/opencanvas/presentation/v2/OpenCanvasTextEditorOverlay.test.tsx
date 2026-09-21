import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';

describe('OpenCanvas text editor overlay', () => {
  it('places the caret at the end of a real label and selects only the placeholder', () => {
    const { unmount } = render(<OpenCanvasTextEditorOverlay bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={vi.fn()} onCancel={vi.fn()} />);
    const editor = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect([editor.selectionStart, editor.selectionEnd]).toEqual([6, 6]);
    unmount();
    render(<OpenCanvasTextEditorOverlay bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Text" onCommit={vi.fn()} onCancel={vi.fn()} />);
    const placeholder = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect([placeholder.selectionStart, placeholder.selectionEnd]).toEqual([0, 4]);
  });

  it('Tab commits', () => {
    const onCommit = vi.fn();
    render(<OpenCanvasTextEditorOverlay bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={onCommit} onCancel={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('Before');
  });

  it('a blur while the window loses focus keeps a non-empty label instead of committing empty', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(<OpenCanvasTextEditorOverlay bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={onCommit} onCancel={onCancel} />);
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: '' } });
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    fireEvent.blur(editor);
    hasFocus.mockRestore();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });

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
