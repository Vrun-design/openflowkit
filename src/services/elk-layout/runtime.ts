import type { ElkNode } from 'elkjs/lib/elk.bundled.js';
import { createLogger } from '@/lib/logger';

export interface ElkLayoutEngine {
  layout: (graph: ElkNode) => Promise<ElkNode>;
}

interface ElkModuleLike {
  default?: new () => unknown;
}

const logger = createLogger({ scope: 'elkLayout' });
let elkInstancePromise: Promise<ElkLayoutEngine> | null = null;

function canUseElkWorker(): boolean {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return false;
  // Vitest exposes MODE='test'; skip worker path in unit tests (jsdom Worker stub).
  const mode = (import.meta as { env?: { MODE?: string } }).env?.MODE;
  return mode !== 'test';
}

async function loadBundledElk(): Promise<ElkLayoutEngine> {
  // Only reachable in dev/test; production builds use the worker path exclusively
  // so the bundled engine (~1.4MB) is tree-shaken from the prod bundle.
  const module = (await import('elkjs/lib/elk.bundled.js')) as ElkModuleLike;
  if (typeof module.default !== 'function') {
    throw new Error('ELK module did not expose a constructor.');
  }
  const candidate = new module.default();
  if (!candidate || typeof (candidate as ElkLayoutEngine).layout !== 'function') {
    throw new Error('ELK instance does not implement layout().');
  }
  return candidate as ElkLayoutEngine;
}

async function loadWorkerElk(): Promise<ElkLayoutEngine> {
  const module = (await import('elkjs/lib/elk-api.js')) as ElkModuleLike;
  if (typeof module.default !== 'function') {
    throw new Error('ELK worker module did not expose a constructor.');
  }
  const workerUrl = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;
  const Ctor = module.default as new (args: { workerUrl: string }) => ElkLayoutEngine;
  const candidate = new Ctor({ workerUrl });
  if (!candidate || typeof candidate.layout !== 'function') {
    throw new Error('ELK worker instance does not implement layout().');
  }
  return candidate;
}

export async function getElkInstance(): Promise<ElkLayoutEngine> {
  if (!elkInstancePromise) {
    elkInstancePromise = (async () => {
      if (canUseElkWorker()) {
        try {
          return await loadWorkerElk();
        } catch (error) {
          logger.warn('ELK worker init failed; falling back to in-process layout.', { error });
        }
      }
      // Vite replaces `import.meta.env.PROD` at build time so the bundled-engine
      // import below is unreachable in prod and gets tree-shaken (~1.4MB savings).
      if (import.meta.env.PROD) {
        throw new Error('ELK worker failed to initialize and no in-process fallback is shipped.');
      }
      return loadBundledElk();
    })();
  }
  return elkInstancePromise;
}
