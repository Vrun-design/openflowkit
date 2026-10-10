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

  const parkedNext = (url: string, init?: RequestInit) => new URL(url).pathname === '/next'
    ? new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    : null;
  const options: V2AgentBridgeOptions = {
    enabled: true, port: 43119, token: '', document: createTestDocument(), pageId: 'page-1', revision: 1,
    capabilities: {} as OpCapabilities, commit: vi.fn(), onActivity: vi.fn(),
  };

  it('a hello the server refuses is a failure, whatever the status', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => parkedNext(url, init) ?? Promise.resolve(new Response('{}', { status: 500 }))));
    const { result, unmount } = renderHook(() => useV2AgentBridge(options));
    await waitFor(() => expect(result.current).toMatchObject({ status: 'error', detail: 'The agent bridge answered 500.' }));
    unmount();
  });

  it('a retry keeps the error on screen instead of flickering back to connecting', async () => {
    let hellos = 0;
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (new URL(url).pathname === '/hello') hellos += 1;
      // A real refused connection takes a moment, long enough for React to paint what came before it.
      return new Promise<Response>((_, reject) => setTimeout(() => reject(new TypeError('Failed to fetch')), 20));
    }));
    const seen: string[] = [];
    const { result, unmount } = renderHook(() => {
      const bridge = useV2AgentBridge(options);
      seen.push(bridge.status);
      return bridge;
    });
    await waitFor(() => expect(hellos).toBeGreaterThanOrEqual(2), { timeout: 4000 });
    expect(result.current).toMatchObject({ status: 'error', detail: 'Nothing is listening on 127.0.0.1:43119.' });
    expect(seen.slice(seen.indexOf('error'))).not.toContain('connecting');
    unmount();
  });
  it('after an agent edit it reports what changed, for the camera and the panel', async () => {
    let served = false;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (new URL(url).pathname === '/next' && !served) {
        served = true;
        return Promise.resolve(new Response(JSON.stringify({ id: 'r1', op: 'add_shape', input: { kind: 'rectangle', id: 'n1' } }), { status: 200 }));
      }
      return parkedNext(url, init) ?? Promise.resolve(new Response('{}', { status: 200 }));
    }));
    const onApplied = vi.fn();
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useV2AgentBridge({ ...options, commit, onApplied }));
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith(['n1']));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.activity).toBe('Create rectangle');
    unmount();
  });
});
