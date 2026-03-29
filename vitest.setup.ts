import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Web Storage polyfill — Node.js 22+ ships a stub `localStorage` / `sessionStorage`
// on `globalThis` that has NO methods (setItem, getItem, etc.) unless the process
// was started with `--localstorage-file`. Vitest's jsdom environment sets up proper
// Storage objects on `window`, but in worker threads the Node.js stub can shadow them.
//
// This setup file replaces both globals with a real in-memory implementation so that
// any test code — whether it accesses `localStorage`, `window.localStorage`, or
// `globalThis.localStorage` — gets a fully-functional Storage API.
// ---------------------------------------------------------------------------

class InMemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function hasWorkingStorage(storageName: 'localStorage' | 'sessionStorage'): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, storageName);
  if (!descriptor) {
    return false;
  }

  if ('value' in descriptor) {
    return typeof descriptor.value?.setItem === 'function';
  }

  // Node 22 exposes stub storage globals behind accessors that emit warnings
  // when touched without `--localstorage-file`. Replace accessor-backed values
  // outright instead of probing them.
  return false;
}

if (!hasWorkingStorage('localStorage')) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new InMemoryStorage(),
    writable: true,
    configurable: true,
  });
}

if (!hasWorkingStorage('sessionStorage')) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new InMemoryStorage(),
    writable: true,
    configurable: true,
  });
}
