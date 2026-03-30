import { captureAnalyticsEvent } from '@/services/analytics/analytics';

export type StorageTelemetrySeverity = 'info' | 'warning' | 'error';

export interface StorageTelemetryEvent {
  area: 'persist' | 'snapshot' | 'schema' | 'indexeddb-state' | 'ai-settings' | 'runtime';
  code: string;
  severity: StorageTelemetrySeverity;
  message: string;
}

type StorageTelemetryHandler = (event: StorageTelemetryEvent) => void;

let telemetryHandler: StorageTelemetryHandler | null = null;

export function setStorageTelemetryHandler(handler: StorageTelemetryHandler | null): void {
  telemetryHandler = handler;
}

export function reportStorageTelemetry(event: StorageTelemetryEvent): void {
  if (telemetryHandler) {
    try {
      telemetryHandler(event);
    } catch {
      // Telemetry is non-critical and must never break storage behavior.
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
