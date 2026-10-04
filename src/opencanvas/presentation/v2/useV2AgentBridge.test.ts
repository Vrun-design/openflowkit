import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OpCapabilities } from '../../../agent/ops/types';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { useV2AgentBridge, type V2AgentBridgeOptions } from './useV2AgentBridge';

// The bridge starts when a window reloads with the agent still enabled, which is before the document loads.
describe('useV2AgentBridge', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tells the server about a document that loads after the bridge started', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      const { pathname, searchParams } = new URL(url);
      calls.push(`${init?.method ?? 'GET'} ${pathname} token=${searchParams.get('token')}`);
      if (pathname === '/next') {
        return new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
      }
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    }));
    const base: V2AgentBridgeOptions = {
      enabled: true, port: 43119, token: 'secret', document: null, pageId: null, revision: 0,
      capabilities: {} as OpCapabilities, commit: vi.fn(), onActivity: vi.fn(),
    };
    const { rerender, unmount } = renderHook((options: V2AgentBridgeOptions) => useV2AgentBridge(options), { initialProps: base });
    await waitFor(() => expect(calls.some((call) => call.startsWith('GET /next'))).toBe(true));
    expect(calls.some((call) => call.includes('/hello'))).toBe(false);

    rerender({ ...base, document: createTestDocument(), pageId: 'page-1', revision: 1 });
    await waitFor(() => expect(calls).toContain('POST /hello token=secret'));
    // The token travels in the query: a custom header would make every call a CORS preflight.
    expect(calls.every((call) => call.endsWith('token=secret'))).toBe(true);
    unmount();
  });
});
