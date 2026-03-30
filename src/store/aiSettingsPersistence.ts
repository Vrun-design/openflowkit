import { DEFAULT_AI_SETTINGS } from './defaults';
import { sanitizeAISettings } from './aiSettings';
import type { AISettings } from './types';
import { parsePersistedAISettingsJson } from './aiSettingsSchemas';
import { reportStorageTelemetry } from '@/services/storage/storageTelemetry';

const AI_SETTINGS_STORAGE_KEY = 'openflowkit-ai-settings';
const AI_SETTINGS_SECRET_STORAGE_KEY = 'openflowkit-ai-settings-secret';
const SECRET_PAYLOAD_VERSION = 'v1';

function getStorageSafe(storageType: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return storageType === 'local' ? window.localStorage : window.sessionStorage;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function encodeBase64(value: string): string {
  return window.btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value: string): string {
  return decodeURIComponent(escape(window.atob(value)));
}

function createSecretMaskSeed(): string {
  if (typeof window === 'undefined') {
    return AI_SETTINGS_SECRET_STORAGE_KEY;
  }

  return `${window.location.origin}:${window.navigator.userAgent}:${AI_SETTINGS_SECRET_STORAGE_KEY}`;
}

function xorWithSeed(value: string, seed: string): string {
  return Array.from(value, (char, index) => {
    const code = char.charCodeAt(0);
    const seedCode = seed.charCodeAt(index % seed.length);
    return String.fromCharCode(code ^ seedCode);
  }).join('');
}

function maskSecret(secret: string): string {
  // This is deliberate at-rest masking for browser storage, not a substitute for XSS protection.
  const seed = createSecretMaskSeed();
  const masked = xorWithSeed(secret, seed);
  return `${SECRET_PAYLOAD_VERSION}:${encodeBase64(masked)}`;
}

function unmaskSecret(payload: string): string | null {
  const [version, encoded] = payload.split(':', 2);
  if (version !== SECRET_PAYLOAD_VERSION || !encoded) {
    return null;
  }

  try {
    const masked = decodeBase64(encoded);
    return xorWithSeed(masked, createSecretMaskSeed());
  } catch {
    return null;
  }
}

function clearStoredSecret(storageType: 'local' | 'session'): void {
  const storage = getStorageSafe(storageType);
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AI_SETTINGS_SECRET_STORAGE_KEY);
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'REMOVE_SECRET_FAILED',
      severity: 'warning',
      message: `Failed to clear ${storageType} AI secret: ${toErrorMessage(error)}`,
    });
  }
}

function readStoredSecret(storageType: 'local' | 'session'): string | undefined {
  const storage = getStorageSafe(storageType);
  if (!storage) {
    return undefined;
  }

  try {
    const rawSecret = storage.getItem(AI_SETTINGS_SECRET_STORAGE_KEY);
    if (!rawSecret) {
      return undefined;
    }

    return unmaskSecret(rawSecret) ?? undefined;
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'READ_SECRET_FAILED',
      severity: 'warning',
      message: `Failed to read ${storageType} AI secret: ${toErrorMessage(error)}`,
    });
    return undefined;
  }
}

function writeStoredSecret(storageType: 'local' | 'session', apiKey: string | undefined): void {
  const storage = getStorageSafe(storageType);
  if (!storage) {
    return;
  }

  try {
    if (!apiKey) {
      storage.removeItem(AI_SETTINGS_SECRET_STORAGE_KEY);
      return;
    }

    storage.setItem(AI_SETTINGS_SECRET_STORAGE_KEY, maskSecret(apiKey));
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'WRITE_SECRET_FAILED',
      severity: 'warning',
      message: `Failed to persist ${storageType} AI secret: ${toErrorMessage(error)}`,
    });
  }
}

function removeStoredAISettings(storageType: 'local' | 'session'): void {
  const storage = getStorageSafe(storageType);
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AI_SETTINGS_STORAGE_KEY);
    clearStoredSecret(storageType);
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'REMOVE_FAILED',
      severity: 'warning',
      message: `Failed to clear ${storageType} AI settings: ${toErrorMessage(error)}`,
    });
  }
}

function readStoredAISettings(storageType: 'local' | 'session'): AISettings | null {
  const storage = getStorageSafe(storageType);
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = parsePersistedAISettingsJson(rawValue);
    if (!parsed) {
      reportStorageTelemetry({
        area: 'ai-settings',
        code: 'READ_INVALID_PAYLOAD',
        severity: 'warning',
        message: `Ignored malformed ${storageType} AI settings payload.`,
      });
      return null;
    }

    const sanitizedSettings = sanitizeAISettings(parsed, {
      ...DEFAULT_AI_SETTINGS,
      storageMode: storageType,
    });
    const storedSecret = readStoredSecret(storageType);

    return {
      ...sanitizedSettings,
      apiKey: storedSecret ?? sanitizedSettings.apiKey,
    };
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'READ_FAILED',
      severity: 'warning',
      message: `Failed to read ${storageType} AI settings: ${toErrorMessage(error)}`,
    });
    return null;
  }
}

export function loadPersistedAISettings(): AISettings {
  const sessionSettings = readStoredAISettings('session');
  if (sessionSettings) {
    return sessionSettings;
  }

  return readStoredAISettings('local') ?? DEFAULT_AI_SETTINGS;
}

export function persistAISettings(settings: AISettings): void {
  const sanitizedSettings = sanitizeAISettings(settings, DEFAULT_AI_SETTINGS);
  const storage = getStorageSafe(sanitizedSettings.storageMode);
  if (!storage) {
    return;
  }

  try {
    const { apiKey, ...persistedSettings } = sanitizedSettings;
    storage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(persistedSettings));
    writeStoredSecret(sanitizedSettings.storageMode, apiKey);
    removeStoredAISettings(sanitizedSettings.storageMode === 'local' ? 'session' : 'local');
  } catch (error) {
    reportStorageTelemetry({
      area: 'ai-settings',
      code: 'WRITE_FAILED',
      severity: 'warning',
      message: `Failed to persist ${sanitizedSettings.storageMode} AI settings: ${toErrorMessage(error)}`,
    });
  }
}

export function clearPersistedAISettings(): void {
  removeStoredAISettings('local');
  removeStoredAISettings('session');
}
