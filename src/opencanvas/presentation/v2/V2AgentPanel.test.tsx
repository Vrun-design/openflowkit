import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyButton } from './V2AgentPanel';

describe('CopyButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says the copy failed when the clipboard refuses it', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => Promise.reject(new DOMException('denied', 'NotAllowedError'))) } });
    render(<CopyButton text="reply" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeTruthy();
  });
});
