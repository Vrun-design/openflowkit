import { useCallback, useEffect, useRef, useState } from 'react';
import {
  inspectBrowserStoragePressure,
  requestBrowserPersistentStorage,
  type PersistentStorageRequestResult,
  type StoragePressureSnapshot,
} from '@/lib/storagePressure';
import {
  getStoragePressureLevelForTelemetry,
  subscribeStorageTelemetry,
} from '@/services/storage/storageTelemetry';

export interface StoragePressureGuardState {
  readonly snapshot: StoragePressureSnapshot;
  readonly dismiss: () => void;
  readonly downloadBackup: () => void;
  readonly persistenceRequestStatus: 'idle' | 'requesting' | PersistentStorageRequestResult;
  readonly requestPersistence: () => void;
}

interface UseStoragePressureGuardOptions {
  trigger: unknown;
  onExportJSON: () => void;
}

function pressureIdentity(snapshot: StoragePressureSnapshot): string {
  const ratioBucket = snapshot.ratio === null ? 'unknown' : Math.floor(snapshot.ratio * 20);
  return `${snapshot.level}:${ratioBucket}`;
}

export function useStoragePressureGuard({
  trigger,
  onExportJSON,
}: UseStoragePressureGuardOptions): StoragePressureGuardState | null {
  const [snapshot, setSnapshot] = useState<StoragePressureSnapshot | null>(null);
  const [persistenceRequestStatus, setPersistenceRequestStatus] = useState<
    StoragePressureGuardState['persistenceRequestStatus']
  >('idle');
  const dismissedIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void inspectBrowserStoragePressure().then((next) => {
      if (cancelled) return;
      if (next.level === 'healthy' || next.level === 'unavailable') {
        dismissedIdentityRef.current = null;
        setSnapshot(null);
        return;
      }
      setPersistenceRequestStatus('idle');
      if (dismissedIdentityRef.current !== pressureIdentity(next)) setSnapshot(next);
    });
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  useEffect(() => subscribeStorageTelemetry((event) => {
    const level = getStoragePressureLevelForTelemetry(event);
    if (!level) return;
    setSnapshot({
      level,
      usageBytes: null,
      quotaBytes: null,
      ratio: null,
      persisted: null,
      source: 'write-failure',
    });
  }), []);

  const dismiss = useCallback(() => {
    if (snapshot) dismissedIdentityRef.current = pressureIdentity(snapshot);
    setSnapshot(null);
  }, [snapshot]);

  const downloadBackup = useCallback(() => {
    onExportJSON();
  }, [onExportJSON]);

  const requestPersistence = useCallback(() => {
    setPersistenceRequestStatus('requesting');
    void requestBrowserPersistentStorage().then((result) => {
      setPersistenceRequestStatus(result);
      if (result === 'granted') {
        setSnapshot((current) => current ? { ...current, persisted: true } : current);
      }
    });
  }, []);

  return snapshot ? {
    snapshot,
    dismiss,
    downloadBackup,
    persistenceRequestStatus,
    requestPersistence,
  } : null;
}
