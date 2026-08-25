import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import { isQuotaExceededError } from '@/lib/storagePressure';

export type StorageTelemetrySeverity = 'info' | 'warning' | 'error';

export interface StorageTelemetryEvent {
  area: 'persist' | 'snapshot' | 'schema' | 'indexeddb-state' | 'ai-settings' | 'runtime';
  code: string;
  severity: StorageTelemetrySeverity;
  message: string;
}

export type StoragePressureTelemetryLevel = 'warning' | 'critical';

export interface StorageWriteFailureClassification {
  readonly code: string;
  readonly quotaExceeded: boolean;
}

const STORAGE_PRESSURE_CODES: Readonly<Record<string, StoragePressureTelemetryLevel>> = {
  ASSET_QUOTA_FALLBACK_DATA_URL: 'warning',
  LOCAL_FIRST_QUOTA_FALLBACK_LOCAL: 'warning',
  SNAPSHOT_QUOTA_AUTO_PRUNED: 'warning',
  PERSIST_QUOTA_EXHAUSTED: 'critical',
  SNAPSHOT_QUOTA_EXHAUSTED: 'critical',
};

type StorageTelemetryHandler = (event: StorageTelemetryEvent) => void;

let telemetryHandler: StorageTelemetryHandler | null = null;
const telemetrySubscribers = new Set<StorageTelemetryHandler>();

export function setStorageTelemetryHandler(handler: StorageTelemetryHandler | null): void {
  telemetryHandler = handler;
}

export function subscribeStorageTelemetry(handler: StorageTelemetryHandler): () => void {
  telemetrySubscribers.add(handler);
  return () => {
    telemetrySubscribers.delete(handler);
  };
}

export function getStoragePressureLevelForTelemetry(
  event: StorageTelemetryEvent
): StoragePressureTelemetryLevel | null {
  return STORAGE_PRESSURE_CODES[event.code] ?? null;
}

export function classifyStorageWriteFailure(
  error: unknown,
  codes: { readonly quotaExceeded: string; readonly fallback: string }
): StorageWriteFailureClassification {
  const quotaExceeded = isQuotaExceededError(error);
  return {
    code: quotaExceeded ? codes.quotaExceeded : codes.fallback,
    quotaExceeded,
  };
}

export function reportStorageTelemetry(event: StorageTelemetryEvent): void {
  if (telemetryHandler) {
    try {
      telemetryHandler(event);
    } catch {
      // Telemetry is non-critical and must never break storage behavior.
    }
  }
  for (const subscriber of telemetrySubscribers) {
    try {
      subscriber(event);
    } catch {
      // Diagnostics subscribers are isolated from persistence behavior.
    }
  }

  if (event.severity !== 'info') {
    captureAnalyticsEvent('storage_issue_reported', {
      area: event.area,
      code: event.code,
      severity: event.severity,
    });
  }
}
