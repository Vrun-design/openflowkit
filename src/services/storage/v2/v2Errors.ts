// Save/load outcomes are returned, not thrown: stale revisions are expected
// control flow. Only boundary failures throw, and each has its own type so
// callers can distinguish "storage is gone" from "storage is full".
export class V2StorageUnavailableError extends Error {
  constructor(message = 'IndexedDB is not available for v2 documents.') {
    super(message);
    this.name = 'V2StorageUnavailableError';
  }
}

export class V2StorageQuotaError extends Error {
  constructor(message = 'IndexedDB quota was exceeded while saving a v2 document.') {
    super(message);
    this.name = 'V2StorageQuotaError';
  }
}

export class V2StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'V2StorageError';
  }
}

export function isQuotaFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'QuotaExceededError'
  );
}
