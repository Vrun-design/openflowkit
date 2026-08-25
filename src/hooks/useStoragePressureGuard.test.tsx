import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoragePressureGuard } from './useStoragePressureGuard';
import { reportStorageTelemetry } from '@/services/storage/storageTelemetry';

const originalStorage = navigator.storage;

function setStorageEstimate(usage: number, quota: number, persist = false): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: vi.fn(async () => ({ usage, quota })),
      persisted: vi.fn(async () => false),
      persist: vi.fn(async () => persist),
    },
  });
}

describe('useStoragePressureGuard', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
  });

  it('exposes a non-blocking critical notice and backup action', async () => {
    setStorageEstimate(950, 1000);
    const onExportJSON = vi.fn();
    const { result } = renderHook(() => useStoragePressureGuard({
      trigger: 'one',
      onExportJSON,
    }));
    await waitFor(() => expect(result.current?.snapshot.level).toBe('critical'));
    act(() => result.current?.downloadBackup());
    expect(onExportJSON).toHaveBeenCalledTimes(1);
  });

  it('updates the notice after an explicit persistent-storage grant', async () => {
    setStorageEstimate(950, 1000, true);
    const { result } = renderHook(() => useStoragePressureGuard({
      trigger: 'one',
      onExportJSON: vi.fn(),
    }));
    await waitFor(() => expect(result.current?.snapshot.persisted).toBe(false));
    act(() => result.current?.requestPersistence());
    await waitFor(() => expect(result.current?.persistenceRequestStatus).toBe('granted'));
    expect(result.current?.snapshot.persisted).toBe(true);
  });

  it('keeps a dismissed pressure bucket hidden until pressure changes', async () => {
    setStorageEstimate(760, 1000);
    const { result, rerender } = renderHook(({ trigger }) => useStoragePressureGuard({
      trigger,
      onExportJSON: vi.fn(),
    }), { initialProps: { trigger: 'one' } });
    await waitFor(() => expect(result.current?.snapshot.level).toBe('warning'));
    act(() => result.current?.dismiss());
    expect(result.current).toBeNull();
    rerender({ trigger: 'two' });
    await act(async () => Promise.resolve());
    expect(result.current).toBeNull();
  });

  it('surfaces an authoritative quota-write failure immediately', async () => {
    setStorageEstimate(100, 1000);
    const { result } = renderHook(() => useStoragePressureGuard({
      trigger: 'one',
      onExportJSON: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    act(() => reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_QUOTA_EXHAUSTED',
      severity: 'error',
      message: 'full',
    }));
    expect(result.current?.snapshot).toMatchObject({
      level: 'critical',
      source: 'write-failure',
      ratio: null,
    });
  });

  it('surfaces primary-document quota exhaustion immediately', async () => {
    setStorageEstimate(100, 1000);
    const { result } = renderHook(() => useStoragePressureGuard({
      trigger: 'one',
      onExportJSON: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    act(() => reportStorageTelemetry({
      area: 'persist',
      code: 'PERSIST_QUOTA_EXHAUSTED',
      severity: 'error',
      message: 'full',
    }));
    expect(result.current?.snapshot).toMatchObject({
      level: 'critical',
      source: 'write-failure',
      ratio: null,
    });
  });

  it('warns when asset persistence falls back to an inline data URL', async () => {
    setStorageEstimate(100, 1000);
    const { result } = renderHook(() => useStoragePressureGuard({
      trigger: 'one',
      onExportJSON: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    act(() => reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_QUOTA_FALLBACK_DATA_URL',
      severity: 'warning',
      message: 'fallback active',
    }));
    expect(result.current?.snapshot).toMatchObject({
      level: 'warning',
      source: 'write-failure',
      ratio: null,
    });
  });
});
