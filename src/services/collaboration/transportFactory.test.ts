import { describe, expect, it } from 'vitest';
import { createCollaborationTransportFactory } from './transportFactory';
import { createInMemoryCollaborationTransport } from './transport';

describe('collaboration transport factory', () => {
  it('returns in-memory transport for explicit in-memory mode', () => {
    const result = createCollaborationTransportFactory('in-memory');
    expect(result.resolvedMode).toBe('in-memory');
    expect(result.fallbackReason).toBeUndefined();
  });

  it('falls back to in-memory transport for realtime mode when runtime support is unavailable', () => {
    const result = createCollaborationTransportFactory('realtime', {
      isRealtimeSupported: () => false,
    });
    expect(result.resolvedMode).toBe('in-memory');
    expect(result.fallbackReason).toBe('not_supported_yet');
  });

  it('returns realtime transport when runtime support is available', () => {
    const transport = createInMemoryCollaborationTransport();
    const result = createCollaborationTransportFactory('realtime', {
      isRealtimeSupported: () => true,
      createRealtimeTransport: () => transport,
    });
    expect(result.resolvedMode).toBe('realtime');
    expect(result.transport).toBe(transport);
    expect(result.fallbackReason).toBeUndefined();
  });

  it('keeps whenReady available on returned transports when provided by the realtime transport', async () => {
    const transport = {
      ...createInMemoryCollaborationTransport(),
      whenReady: () => Promise.resolve(),
    };
    const result = createCollaborationTransportFactory('realtime', {
      isRealtimeSupported: () => true,
      createRealtimeTransport: () => transport,
    });

    await expect(result.transport.whenReady?.()).resolves.toBeUndefined();
  });
});
