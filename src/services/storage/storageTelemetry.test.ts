import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import {
  classifyStorageWriteFailure,
  getStoragePressureLevelForTelemetry,
  reportStorageTelemetry,
  setStorageTelemetryHandler,
  subscribeStorageTelemetry,
  type StorageTelemetryEvent,
} from './storageTelemetry';

vi.mock('@/services/analytics/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

describe('storageTelemetry', () => {
  afterEach(() => {
    setStorageTelemetryHandler(null);
    vi.mocked(captureAnalyticsEvent).mockClear();
  });

  it('forwards events to registered handler', () => {
    const handler = vi.fn();
    setStorageTelemetryHandler(handler);

    const event: StorageTelemetryEvent = {
      area: 'persist',
      code: 'TEST',
      severity: 'info',
      message: 'test message',
    };
    reportStorageTelemetry(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('never throws when handler throws', () => {
    setStorageTelemetryHandler(() => {
      throw new Error('telemetry boom');
    });

    expect(() => {
      reportStorageTelemetry({
        area: 'schema',
        code: 'THROW',
        severity: 'warning',
        message: 'throw test',
      });
    }).not.toThrow();
  });

  it('forwards warning and error events to analytics capture', () => {
    setStorageTelemetryHandler(null);

    reportStorageTelemetry({
      area: 'snapshot',
      code: 'SNAPSHOT_SAVE_FALLBACK_LOCAL',
      severity: 'warning',
      message: 'warning test',
    });

    expect(captureAnalyticsEvent).toHaveBeenLastCalledWith('storage_issue_reported', {
      area: 'snapshot',
      code: 'SNAPSHOT_SAVE_FALLBACK_LOCAL',
      severity: 'warning',
    });
  });

  it('supports isolated lifecycle-safe subscribers', () => {
    const subscriber = vi.fn();
    const unsubscribe = subscribeStorageTelemetry(subscriber);
    const event: StorageTelemetryEvent = {
      area: 'snapshot',
      code: 'SNAPSHOT_QUOTA_EXHAUSTED',
      severity: 'error',
      message: 'full',
    };
    reportStorageTelemetry(event);
    expect(subscriber).toHaveBeenCalledWith(event);
    unsubscribe();
    reportStorageTelemetry(event);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('classifies only explicit quota-pressure events', () => {
    const event = (code: string): StorageTelemetryEvent => ({
      area: 'persist',
      code,
      severity: 'warning',
      message: code,
    });

    expect(getStoragePressureLevelForTelemetry(
      event('LOCAL_FIRST_QUOTA_FALLBACK_LOCAL')
    )).toBe('warning');
    expect(getStoragePressureLevelForTelemetry(
      event('ASSET_QUOTA_FALLBACK_DATA_URL')
    )).toBe('warning');
    expect(getStoragePressureLevelForTelemetry(event('PERSIST_QUOTA_EXHAUSTED'))).toBe('critical');
    expect(getStoragePressureLevelForTelemetry(event('PERSIST_SNAPSHOT_FAILED'))).toBeNull();
  });

  it('normalizes browser quota errors without misclassifying other failures', () => {
    const codes = { quotaExceeded: 'QUOTA', fallback: 'FAILED' } as const;

    expect(classifyStorageWriteFailure(
      new DOMException('full', 'QuotaExceededError'),
      codes
    )).toEqual({ code: 'QUOTA', quotaExceeded: true });
    expect(classifyStorageWriteFailure(new Error('offline'), codes)).toEqual({
      code: 'FAILED',
      quotaExceeded: false,
    });
  });
});
