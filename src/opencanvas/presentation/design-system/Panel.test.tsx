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
});
