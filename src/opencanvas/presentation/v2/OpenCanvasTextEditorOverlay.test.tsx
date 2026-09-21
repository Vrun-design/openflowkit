import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpenCanvasTextEditorOverlay } from './OpenCanvasTextEditorOverlay';
import { resolveNodeStyle } from '../../domain/nodes/nodeStyle';

const style = resolveNodeStyle({
  id: 'n', kind: 'process', parentId: null, layerId: 'default', zIndex: 0,
  transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
  size: { width: 80, height: 40 }, content: {}, appearance: {}, ports: [], metadata: {}, extensions: {},
});

describe('OpenCanvas text editor overlay', () => {
  it('selects the label on open, or puts the caret after a type-to-edit seed', () => {
    const { unmount } = render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={vi.fn()} onCancel={vi.fn()} />);
    const editor = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect([editor.selectionStart, editor.selectionEnd]).toEqual([0, 6]);
    unmount();
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="H" selectAll={false} onCommit={vi.fn()} onCancel={vi.fn()} />);
    const seeded = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect([seeded.selectionStart, seeded.selectionEnd]).toEqual([1, 1]);
  });

  it('Tab commits', () => {
    const onCommit = vi.fn();
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={onCommit} onCancel={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Tab' });
    expect(onCommit).toHaveBeenCalledWith('Before');
  });

  it('a blur while the window loses focus keeps a non-empty label instead of committing empty', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
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
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 10, y: 20, width: 100, height: 50 }}
      value="Before" onCommit={onCommit} onCancel={vi.fn()} />);
    const editor = screen.getByRole('textbox', { name: 'Edit node label' });
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: 'After' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.blur(editor);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('After');
  });

  it('commits the typed text on Escape instead of discarding it', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" onCommit={onCommit} onCancel={onCancel} />);
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'Typed' } });
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(onCommit).toHaveBeenCalledWith('Typed');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('scales its type with the zoom so it sits on the rendered label', () => {
    render(<OpenCanvasTextEditorOverlay style={style} bounds={{ x: 0, y: 0, width: 80, height: 40 }}
      value="Before" zoom={2} onCommit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveStyle({ fontSize: '28px' });
  });

  it('uses the resolved label colour while typing', () => {
    render(<OpenCanvasTextEditorOverlay style={{ ...style, textColor: '#ffffff' }}
      bounds={{ x: 0, y: 0, width: 80, height: 40 }} value="Dark canvas"
      onCommit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveStyle({ color: '#ffffff' });
  });
});
