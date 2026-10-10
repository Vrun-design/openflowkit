import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2CodePanel } from './V2CodePanel';

const panel = (code: string, onCodeChange = vi.fn(), diagnostics: Parameters<typeof V2CodePanel>[0]['diagnostics'] = []) => render(
  <V2CodePanel code={code} diagnostics={diagnostics} generating={false} canvasEdited={false} palette="pastel"
    onPaletteChange={vi.fn()} onCodeChange={onCodeChange} onGenerate={vi.fn()} onClose={vi.fn()} />,
);

describe('V2CodePanel', () => {
  it('highlights exactly the text the editor holds: CRLF, tabs, emoji and combining marks', () => {
    const code = 'flowchart\r\nCafé 🚀 -> "Ship\tit"\r\nB [diamond]';
    const { container } = panel(code);
    const editor = screen.getByRole('textbox', { name: 'Diagram source' }) as HTMLTextAreaElement;
    expect(container.querySelector('.ofk-v2-code-highlight')!.textContent!.replace(/\n$/, '')).toBe(editor.value.replace(/\r\n/g, '\n'));
  });

  it('jumps to a diagnostic on its own line when the source has CRLF', () => {
    panel('flowchart\r\nA -> B\r\nBroken [oops', vi.fn(), [{ code: 'W101', severity: 'warning', line: 3, col: 8, endCol: 13, message: 'bad', source: 'parse' }]);
    const editor = screen.getByRole('textbox', { name: 'Diagram source' }) as HTMLTextAreaElement;
    fireEvent.click(screen.getByText('Line 3'));
    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('[oops');
  });

  it('leaves Enter to the input method while it is composing', () => {
    const onCodeChange = vi.fn();
    panel('flowchart\nA', onCodeChange);
    const editor = screen.getByRole('textbox', { name: 'Diagram source' });
    fireEvent.keyDown(editor, { key: ' ', ctrlKey: true });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(editor, { key: 'Enter', isComposing: true });
    expect(onCodeChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('is no keyboard trap: Esc leaves the editor for Close, Tab indents, Shift+Tab moves on (WCAG 2.1.2)', () => {
    const onClose = vi.fn();
    const onCodeChange = vi.fn();
    render(<V2CodePanel code="flowchart" diagnostics={[]} generating={false} canvasEdited={false} palette="pastel"
      onPaletteChange={vi.fn()} onCodeChange={onCodeChange} onGenerate={vi.fn()} onClose={onClose} />);
    const editor = screen.getByRole('textbox', { name: 'Diagram source' });
    expect(editor).toHaveAccessibleDescription(/Esc leaves the editor/);
    editor.focus();
    fireEvent.keyDown(editor, { key: 'Tab', shiftKey: true });
    expect(onCodeChange).not.toHaveBeenCalled();
    fireEvent.keyDown(editor, { key: 'Tab' });
    expect(onCodeChange).toHaveBeenCalledWith('  flowchart');
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close panel' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
