// Save/load outcomes are returned, not thrown: stale revisions are expected
// control flow. Only boundary failures throw, and each has its own type so
// callers can distinguish "storage is gone" from "storage is full".
export class V2StorageUnavailableError extends Error {
  constructor(message = 'IndexedDB is not available for v2 documents.') {
    super(message);
    this.name = 'V2StorageUnavailableError';
  }
}

/** Another tab holds the database open at an older version, so this one cannot upgrade it. */
export class V2StorageBlockedError extends V2StorageUnavailableError {
  constructor() {
    super('IndexedDB upgrade is blocked by another open tab.');
    this.name = 'V2StorageBlockedError';
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

/** A save refused because the document would not open again; the message is the person's. */
export class V2DocumentInvalidError extends V2StorageError {
  constructor(issue: { readonly path: string; readonly message: string }) {
    super(`This diagram has a problem we can’t save: ${issue.message} (${issue.path})`);
    this.name = 'V2DocumentInvalidError';
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

/** What a person reads when storage fails: the cause in their terms and what to do next. */
export function describeStorageFailure(error: unknown): { readonly blocked: boolean; readonly message: string } {
  if (error instanceof V2StorageBlockedError) {
    return { blocked: false, message: 'Another OpenFlowKit tab is still open on an older version. Close other OpenFlowKit tabs, then try again.' };
  }
  if (error instanceof V2StorageUnavailableError) {
    return { blocked: true, message: 'This browser is blocking site storage — private windows and some privacy settings do this. Allow storage for this site, then try again.' };
  }
  if (error instanceof V2StorageQuotaError || isQuotaFailure(error)) {
    return { blocked: false, message: 'This browser’s storage for this site is full. Delete diagrams you no longer need, then try again.' };
  }
  return { blocked: false, message: 'This browser’s storage didn’t answer. Try again; if it keeps happening, reload the page.' };
}
