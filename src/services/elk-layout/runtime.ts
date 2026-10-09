import { createLogger } from '@/lib/logger';
import { createElkLayoutPort, type ElkLayoutEngine } from '../dsl/elkLayoutPort';

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
  // elk-api never listens for the worker's error event: a worker that fails to load (a deploy
  // replaced its hashed file under an open tab) would leave every layout pending forever.
  let fail: (error: Error) => void = () => undefined;
  const broken = new Promise<never>((_, reject) => { fail = reject; });
  broken.catch(() => undefined);
  const workerFactory = (url: string) => {
    const worker = new Worker(url);
    worker.addEventListener('error', () => fail(new Error('The layout engine failed to load. Reload the page and try again.')));
    return worker;
  };
  const Ctor = module.default as new (args: { workerUrl: string; workerFactory: (url: string) => Worker }) => ElkLayoutEngine;
  const candidate = new Ctor({ workerUrl, workerFactory });
  if (!candidate || typeof candidate.layout !== 'function') {
    throw new Error('ELK worker instance does not implement layout().');
  }
  return { layout: (graph) => Promise.race([candidate.layout(graph), broken]) };
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

/** The editor's layout port: ELK in a worker, in process under tests. */
export const elkDslLayoutPort = createElkLayoutPort(getElkInstance);
