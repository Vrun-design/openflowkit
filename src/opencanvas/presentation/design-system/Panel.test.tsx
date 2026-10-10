import { describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Panel } from './Panel';

function ReadyField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <input ref={ref} aria-label="Name" />;
}

describe('Panel focus', () => {
  it('lands on Close, and gives focus back to the opener on Escape', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    render(<Panel title="Model" onClose={vi.fn()}>text</Panel>);
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('complementary'), { key: 'Escape' });
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('leaves focus on a field that took it as the panel opened, and still returns it to the opener', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    render(<Panel title="Model" onClose={vi.fn()}><ReadyField /></Panel>);
    expect(screen.getByLabelText('Name')).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' });
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('gives focus back to the opener when it closes with focus inside (⌘J, a toggle), not to <body>', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { rerender } = render(<Panel title="Model" onClose={vi.fn()}>text</Panel>);
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
    rerender(<></>);
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('leaves focus where it was when it opens with autoFocus off', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    render(<Panel title="Model" onClose={vi.fn()} autoFocus={false}>text</Panel>);
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('as a modal it is a dialog that keeps Tab inside', () => {
    render(<Panel title="Keys" onClose={vi.fn()} modal><button type="button">Last</button></Panel>);
    const dialog = screen.getByRole('dialog', { name: 'Keys' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const close = screen.getByRole('button', { name: 'Close panel' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
