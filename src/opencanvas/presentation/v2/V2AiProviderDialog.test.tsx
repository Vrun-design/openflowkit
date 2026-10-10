import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { V2AiProviderDialog } from './V2AiProviderDialog';
import type { V2AiSettings } from './useV2AiSettings';

const settings: V2AiSettings = { provider: 'openai', connections: { openai: { apiKey: 'sk-test-0123456789abcdef', baseUrl: 'https://proxy.example/v1', model: '' } } };

function open() {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
  return render(<V2AiProviderDialog open settings={settings} onSave={vi.fn()} onClose={vi.fn()} />);
}

afterEach(() => vi.unstubAllGlobals());

describe('V2AiProviderDialog', () => {
  it('keeps the endpoint section open while its Base URL is cleared to retype it', () => {
    const { container } = open();
    const details = container.querySelector('details')!;
    expect(details.open).toBe(true);
    fireEvent.change(screen.getByLabelText(/Base URL/), { target: { value: '' } });
    expect(details.open).toBe(true);
  });

  it('editing the key mid-test stops the test and leaves no stale verdict', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Test key' }));
    await vi.waitFor(() => expect(signal).toBeDefined());
    fireEvent.change(screen.getByLabelText(/API key/), { target: { value: 'sk-test-other0123456789' } });
    expect(signal!.aborted).toBe(true);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('status').getAttribute('data-state')).toBe('idle');
  });

  it('on Ollama, defaults to and suggests the models that are installed', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(new Response(
      url.endsWith('/api/tags') ? JSON.stringify({ models: [{ name: 'llama3.2:3b' }, { name: 'qwen3:4b' }] }) : '{}', { status: 200 }))));
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.open = true; };
    const onSave = vi.fn();
    const { container } = render(<V2AiProviderDialog open settings={{ provider: 'ollama', connections: {} }} onSave={onSave} onClose={vi.fn()} />);
    const model = screen.getByLabelText(/^Model/) as HTMLInputElement;
    await waitFor(() => expect(model.placeholder).toBe('llama3.2:3b'));
    expect([...container.querySelectorAll('datalist option')].map((option) => (option as HTMLOptionElement).value)).toEqual(['llama3.2:3b', 'qwen3:4b']);
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(onSave.mock.calls[0]![0].connections.ollama.model).toBe('llama3.2:3b');
  });
});
